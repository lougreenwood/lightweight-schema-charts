/**
 * DataProviderLike
 *
 * Structural interface describing the public contract for all data providers. This interface captures "what a data
 * provider does" rather than "what it is", enabling:
 *
 * - Decoupling: Consumers depend on the interface, not the AbstractDataProvider class
 * - Testability: Easy to create test doubles that implement the interface
 * - Flexibility: Multiple implementations possible without inheritance
 * - Cleaner types: Factory return types reference the interface, not the abstract class
 *
 * The AbstractDataProvider class implements this interface, and all concrete providers inherit from it. However,
 * external code (factories, registries, consumers) should reference DataProviderLike rather than AbstractDataProvider.
 *
 * This is a truly TYPE-ERASED interface. It does NOT know about specific provider implementations or the registry.
 * Properties use base types (unknown, DataStreamIdentifier, DataProviderIdentifier) rather than registry-derived
 * unions.
 *
 * When you need type-safe narrowing to a specific provider type, use `RegisteredDataProvider` from the registry types,
 * which is a discriminated union of all concrete provider types that supports narrowing via type guards.
 */

import type { DataProviderIdentifier } from './abstract-data-provider/types';
import type {
  BaseChartDataSample,
  DataProviderCursor,
  DataStreamIdentifier,
  DataStreamUpdateBatch,
} from './data-stream/types';
import type {
  DataProviderNoCursorForStreamError,
  DataProviderNoNewDataError,
  DataProviderUnknownStreamError,
  DataStreamHasNoDataError,
} from '../errors';
import type { ChartLayoutFragmentData } from '../../schema/types';
import type { Result } from 'true-myth';

/**
 * Structural interface for data providers.
 *
 * Defines the public API contract that all data providers must satisfy. This is the type that should be used in
 * consumer code, factory return types, and registry storage.
 *
 * This is a truly TYPE-ERASED interface. Properties use base types rather than registry-derived unions. For type-safe
 * narrowing, use `RegisteredDataProvider` from the registry types.
 */
export interface DataProviderLike {
  /**
   * The underlying data source (e.g., MarketDataDataStreamModel, IndicatorProvider).
   *
   * Type-erased to `unknown`. Use `RegisteredDataProvider` and type guards for narrowed access.
   */
  readonly dataSource: unknown;

  /**
   * Set of data stream identifiers this provider exposes.
   *
   * Uses base `DataStreamIdentifier` type. Use `RegisteredDataProvider` for narrowed stream identifier types.
   */
  readonly dataStreamIdentifiers: ReadonlySet<DataStreamIdentifier>;

  /**
   * Default layout for this provider's streams. Declares pane structure and which stream types go in which panes.
   * Series-level detail (field paths, visibility) is filled in by the schema from presenters during assembly.
   *
   * The base implementation produces one pane per stream. Multi-stream providers (e.g., MarketDataData) override to group
   * related streams into shared panes.
   */
  readonly defaultLayout: ChartLayoutFragmentData;

  /**
   * Concrete provider identity for this instance.
   *
   * Uses base `DataProviderIdentifier` type. Use `RegisteredDataProvider` for narrowed identifier types.
   */
  readonly identifier: DataProviderIdentifier;

  /**
   * Human-readable name for this provider instance (e.g., "MarketDataData", "EMA Indicator Group").
   */
  readonly name: string;

  /**
   * Stable identity key for layout persistence across window changes. Typically the provider's domain entity ID (e.g.,
   * trade position set ID, indicator template provider ID). Used by the reactive schema to tag series groups so layout
   * state survives data source changes.
   */
  readonly stableLayoutKey: string;

  /**
   * Returns the provider-maintained cursor for the given stream, if available.
   *
   * @param   args.dataStreamIdentifier - The stream to get the cursor for
   *
   * @returns                           Result containing the cursor or an error if stream is unknown or has no cursor
   */
  getCursor(args: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    DataProviderCursor,
    DataProviderNoCursorForStreamError | DataProviderUnknownStreamError
  >;

  /**
   * Returns updates for the given stream since the provided cursor.
   *
   * - Providers must NEVER return empty update sets; return Err(DataProviderNoNewDataError) instead.
   * - When cursor is omitted, providers may use internal cursors or perform initial backfill.
   *
   * @param   args.dataStreamIdentifier - The stream to get data from
   * @param   args.cursor               - Optional cursor to get data since (omit for initial fetch)
   *
   * @returns                           Result containing the update batch or an error
   */
  getDataSince(args: {
    cursor?: DataProviderCursor;
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    DataStreamUpdateBatch<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >,
    DataProviderNoNewDataError | DataProviderUnknownStreamError
  >;

  /**
   * Return an example (latest) sample for a specific stream without advancing the internal cursor.
   *
   * @param   args.dataStreamIdentifier - The stream to get an example from
   *
   * @returns                           Result containing the sample or an error if stream is unknown or has no data
   */
  getExampleDataSampleForStream(args: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    BaseChartDataSample<object, object, DataStreamIdentifier>,
    DataProviderUnknownStreamError | DataStreamHasNoDataError
  >;

  /**
   * Return example (latest) samples for all known streams without advancing cursors.
   *
   * Streams with no data are omitted from the result.
   *
   * @returns Map of stream id to sample
   */
  getExampleDataSampleForStreams(): ReadonlyMap<
    string,
    BaseChartDataSample<object, object, DataStreamIdentifier>
  >;

  /**
   * Plain data-state values for a stream. Consumers that derive them from models implement this here, so the schema
   * never reads a model.
   */
  getDataState(input: { dataStreamIdentifier: DataStreamIdentifier }): {
    cursor: DataProviderCursor | undefined;
    dataHash: string | undefined;
    dataLength: number | undefined;
    projectionId: string | undefined;
  };

  /** Stable group identity for a stream, used as the diff and layout key. */
  groupIdFor(input: { dataStreamIdentifier: DataStreamIdentifier }): string;
}
