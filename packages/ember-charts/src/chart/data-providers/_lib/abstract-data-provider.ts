import type {
  AbstractDataProviderTArgs,
  DataProviderIdentifier,
  InferDataProviderIdentifier,
  InferDataSource,
} from '#src/chart/data-providers/_lib/abstract-data-provider/types';
import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type {
  BaseChartDataSample,
  DataProviderCursor,
  DataStreamIdentifier,
  DataStreamUpdateBatch,
} from '#src/chart/data-providers/_lib/data-stream/types';
import type {
  CreateDataProviderInvalidIdError,
  CreateDataProviderInvalidTypeError,
  DataProviderNoCursorForStreamError,
  DataProviderNoNewDataError,
  DataProviderUnknownStreamError,
  DataStreamHasNoDataError,
} from '#src/chart/data-providers/errors';
import type { ChartLayoutFragmentData } from '#src/chart/schema/types';
import type { TimeWindow } from '#src/chart/data-providers/_lib/data-stream/time-window';
import type { UseArgs } from '#src/vendor/shared-utils/type-utils/resolve-args';

import {
  createDataProviderInvalidIdError,
  createDataProviderInvalidTypeError,
  createDataProviderNoCursorForStreamError,
  createDataProviderNoNewDataError,
  createDataProviderUnknownStreamError,
  createDataStreamHasNoDataError,
} from '#src/chart/data-providers/errors';
import { Maybe } from 'true-myth';
import Result, { err, ok } from 'true-myth/result';

/**
 * AbstractDataProvider
 *
 * Unified base for all providers.
 *
 * - Removes legacy registry-based typing/logic.
 * - Adopts getDataSource(context) as the canonical source for instance typing.
 * - Centralizes identity injection for every sample.
 * - Implements single-stream default with a per-instance stream id (overridable).
 *
 * Stream Id Policy:
 *
 * - Default: one per-instance stream id (UUID).
 * - Providers may override computeStreamIdentifiers() to supply domain-specific ids. For example:
 *
 *   - Market data provider: one UUID (accepted default)
 *   - Other providers: derive ids from the data source sample identity.
 *
 * Uses TArgs V2 pattern for generic constraints.
 */
export abstract class AbstractDataProvider<
  TA extends AbstractDataProviderTArgs = AbstractDataProviderTArgs,
> implements DataProviderLike {
  /**
   * Concrete provider identity for this instance (derived from static's discoverIdentifiers).
   */
  readonly identifier: InferDataProviderIdentifier<
    UseArgs<TA>['dataProviderStatic']
  >;

  /**
   * Human-readable name for this provider instance (the subclasses should set this, e.g., "MarketDataData").
   */
  abstract readonly name: string;

  /**
   * Public accessor for the data source (e.g., IndicatorGroupViewModel, MarketDataDataStreamModel).
   */
  get dataSource(): InferDataSource<UseArgs<TA>['dataProviderStatic']> {
    return this._dataSource;
  }

  /**
   * Public API: resolve the provider's data stream identifiers.
   *
   * - Exposes the static's dataStreamIdentifiers.
   * - Subclasses with dynamic identifiers may override this getter.
   */
  get dataStreamIdentifiers(): UseArgs<TA>['dataProviderStatic']['dataStreamIdentifiers'] {
    return this.staticSide.dataStreamIdentifiers;
  }

  /**
   * Default layout for this provider's streams. One pane per stream, each with an empty series array.
   *
   * The schema fills in series detail (field paths, visibility) from presenters during assembly. Multi-stream providers
   * (e.g., MarketDataData) override to group related streams into shared panes.
   */
  get defaultLayout(): ChartLayoutFragmentData {
    return {
      panes: this.dataStreamIdentifiers
        .values()
        .map((dataStreamIdentifier) => ({
          seriesGroups: [
            {
              groupId: `${this.stableLayoutKey}::${dataStreamIdentifier.type}`,
              series: [] as const,
              stableLayoutKey: this.stableLayoutKey,
              streamType: dataStreamIdentifier.type,
            },
          ],
        }))
        .toArray(),
    };
  }

  getDataState({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): {
    cursor: DataProviderCursor | undefined;
    dataHash: string | undefined;
    dataLength: number | undefined;
    projectionId: string | undefined;
  } {
    const cursor = this.getCursor({ dataStreamIdentifier }).unwrapOr(undefined);
    return {
      cursor,
      dataHash: undefined,
      dataLength: undefined,
      projectionId: undefined,
    };
  }

  groupIdFor({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): string {
    return `${this.stableLayoutKey}::${dataStreamIdentifier.type}`;
  }

  /**
   * Stable identity key for layout persistence. Defaults to identifier.id, which is the domain entity ID (e.g., trade
   * position set ID, indicator template provider ID).
   */
  get stableLayoutKey(): string {
    return this.identifier.id;
  }

  constructor({
    dataSource,
    identifier,
  }: {
    dataSource: InferDataSource<UseArgs<TA>['dataProviderStatic']>;
    identifier: InferDataProviderIdentifier<UseArgs<TA>['dataProviderStatic']>;
  }) {
    // dataSource is passed from create() after getDataSource() succeeds
    // This avoids calling getDataSource in constructor and handles Result properly
    this._dataSource = dataSource;

    this.identifier = identifier;
  }

  /**
   * Returns the provider-maintained cursor for the given stream, if available.
   */
  getCursor({
    dataStreamIdentifier: { id: idForCursor },
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    DataProviderCursor,
    DataProviderNoCursorForStreamError | DataProviderUnknownStreamError
  > {
    const known = this.dataStreamIdentifiers
      .values()
      .some((s) => s.id === idForCursor);

    if (!known) {
      return err(
        createDataProviderUnknownStreamError({ streamId: idForCursor }),
      );
    }

    const cursor = this.#cursorByStreamId.get(idForCursor);
    return cursor
      ? ok(cursor)
      : err(
          createDataProviderNoCursorForStreamError({ streamId: idForCursor }),
        );
  }

  /**
   * Returns updates for the given stream since the provided cursor.
   *
   * - Providers must NEVER return empty update sets: Err(DataProviderNoNewDataError) instead.
   * - When 'cursor' is omitted, providers may use internal cursors or perform initial backfill.
   * - Identity fields (dataProviderId/Type/StreamId) are injected automatically.
   */
  getDataSince({
    cursor,
    dataStreamIdentifier,
  }: {
    cursor?: DataProviderCursor;
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    DataStreamUpdateBatch,
    DataProviderNoNewDataError | DataProviderUnknownStreamError
  > {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      // Translate cursor to time for cursor-agnostic data retrieval
      const sinceDate = cursor ? new Date(cursor.time) : undefined;
      const raw = new Set(
        this._dataSampleSourceRecordsSince({ dataStreamIdentifier, sinceDate }),
      ).values();

      // Map raw records to canonical samples and inject identity using shared helper.
      const data = raw.reduce((acc, dataSampleSource) => {
        const sample = this._makeSampleFromSource({
          dataSampleSource,
          dataStreamIdentifier,
        });
        return acc.add(sample);
      }, new Set<BaseChartDataSample>());

      return this.#finalizeBatch({
        data,
        dataStreamIdentifier,
      });
    });
  }

  /**
   * Return an example (latest) sample for a specific stream without advancing the internal cursor.
   */
  getExampleDataSampleForStream({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<
    BaseChartDataSample,
    DataProviderUnknownStreamError | DataStreamHasNoDataError
  > {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      const raw = new Set(
        this._dataSampleSourceRecordsSince({ dataStreamIdentifier }),
      ).values();

      const lastDataSampleSource = raw.toArray().at(-1);

      if (!lastDataSampleSource) {
        return err(
          createDataStreamHasNoDataError({ streamId: dataStreamIdentifier.id }),
        );
      }

      const sample = this._makeSampleFromSource({
        dataSampleSource: lastDataSampleSource,
        dataStreamIdentifier,
      });
      return ok(sample);
    });
  }

  /**
   * Return example (latest) samples for all known streams without advancing cursors. Streams with no data are omitted.
   */
  getExampleDataSampleForStreams(): ReadonlyMap<string, BaseChartDataSample> {
    const examples = new Map<string, BaseChartDataSample>();

    this.dataStreamIdentifiers.forEach((stream) => {
      const res = this.getExampleDataSampleForStream({
        dataStreamIdentifier: stream,
      });
      res.match({
        Ok: (v) => examples.set(stream.id, v),
        Err: () => {},
      });
    });

    return examples;
  }

  /**
   * Provider-specific data source (e.g., Set<Tick>).
   */
  protected readonly _dataSource: InferDataSource<
    UseArgs<TA>['dataProviderStatic']
  >;

  /**
   * Access the subclass static members in a type-safe manner.
   */
  protected get staticSide(): UseArgs<TA>['dataProviderStatic'] {
    return this.constructor as unknown as UseArgs<TA>['dataProviderStatic'];
  }

  /**
   * Optional helper for subclasses to clear internal cursor state.
   */
  protected clearInternalCursor(args: { streamId: string }): void {
    this.#cursorByStreamId.delete(args.streamId);
  }

  /**
   * Subclasses must adapt a raw record from the data source into the canonical non-identity portion of a
   * ChartDataSample. The base will inject identity fields automatically.
   */
  protected abstract _dataSampleSourceAdapter(args: {
    dataSampleSource: InstanceType<
      UseArgs<TA>['dataProviderStatic']['dataSampleSource']
    >;
    dataStreamIdentifier: DataStreamIdentifier;
  }): Readonly<{
    data: object;
    meta: object;
    time: Date;
    window: TimeWindow;
  }>;

  /**
   * Subclasses must provide an iterable over source records since an optional date.
   */
  protected abstract _dataSampleSourceRecordsSince(args: {
    dataStreamIdentifier: DataStreamIdentifier;
    sinceDate?: Date;
  }): Iterable<
    InstanceType<UseArgs<TA>['dataProviderStatic']['dataSampleSource']>
  >;

  /**
   * Create a canonical BaseChartDataSample from a provider's raw data source record. Identity fields are injected here.
   */
  protected _makeSampleFromSource({
    dataSampleSource,
    dataStreamIdentifier,
  }: {
    dataSampleSource: InstanceType<
      UseArgs<TA>['dataProviderStatic']['dataSampleSource']
    >;
    dataStreamIdentifier: DataStreamIdentifier;
  }): BaseChartDataSample {
    const core = this._dataSampleSourceAdapter({
      dataSampleSource,
      dataStreamIdentifier,
    });

    return {
      data: core.data,
      dataProviderIdentifier: this.identifier,
      dataStreamIdentifier,
      meta: core.meta,
      time: core.time,
      window: core.window,
    };
  }

  /**
   * Optional helper for subclasses to set internal cursor state.
   */
  protected setInternalCursor(args: {
    cursor: DataProviderCursor;
    streamId: string;
  }): void {
    this.#cursorByStreamId.set(args.streamId, args.cursor);
  }

  // Internal per-stream cursor store
  #cursorByStreamId = new Map<string, DataProviderCursor>();

  // Internal helpers
  #finalizeBatch({
    data,
    dataStreamIdentifier,
  }: {
    data: ReadonlySet<BaseChartDataSample>;
    dataStreamIdentifier: DataStreamIdentifier;
  }): Result<DataStreamUpdateBatch, DataProviderNoNewDataError> {
    if (data.size === 0) {
      return err(
        createDataProviderNoNewDataError({ streamId: dataStreamIdentifier.id }),
      );
    }

    const latestSample = data.values().reduce(
      (currentLatest, sample) => {
        if (currentLatest === undefined) {
          return sample;
        }

        return sample.time.getTime() > currentLatest.time.getTime()
          ? sample
          : currentLatest;
      },
      undefined as BaseChartDataSample | undefined,
    );

    if (latestSample === undefined) {
      return err(
        createDataProviderNoNewDataError({ streamId: dataStreamIdentifier.id }),
      );
    }

    const newCursor: DataProviderCursor = { time: latestSample.time.getTime() };
    this.#cursorByStreamId.set(dataStreamIdentifier.id, newCursor);

    const updates = new Set(
      data
        .values()
        .map((sample) => ({ data: sample, kind: 'append' as const })),
    );

    return ok({ dataStreamIdentifier, newCursor, updates });
  }

  #validateStreamIdentifier(
    dataStreamIdentifier: DataStreamIdentifier,
  ): Result<DataStreamIdentifier, DataProviderUnknownStreamError> {
    const { id } = dataStreamIdentifier;

    const known = this.dataStreamIdentifiers.values().some((s) => s.id === id);

    return known
      ? ok(dataStreamIdentifier)
      : err(createDataProviderUnknownStreamError({ streamId: id }));
  }
}

/**
 * Validates a data provider identifier against discovered identifiers.
 *
 * This shared utility ensures consistent validation logic across all data providers. It checks if the provided
 * identifier matches any discovered identifier and returns appropriate errors if validation fails.
 *
 * @param   identifier            - The identifier to validate
 * @param   discoveredIdentifiers - Set of valid identifiers from discoverIdentifiers()
 *
 * @returns                       Result indicating validation success or specific error (type or id mismatch)
 */
export function validateDataProviderIdentifier({
  identifier,
  validIdentifiers,
}: {
  identifier: DataProviderIdentifier;
  validIdentifiers: ReadonlySet<DataProviderIdentifier>;
}): Result<
  true,
  CreateDataProviderInvalidIdError | CreateDataProviderInvalidTypeError
> {
  // Check if the provided identifier matches any discovered identifier
  const isValid = Maybe.of(
    validIdentifiers
      .values()
      .some(
        (discovered) =>
          discovered.type === identifier.type &&
          discovered.id === identifier.id,
      ),
  );

  return isValid.match<
    Result<
      true,
      CreateDataProviderInvalidIdError | CreateDataProviderInvalidTypeError
    >
  >({
    Just: () => {
      return ok(true);
    },

    Nothing: () => {
      // Determine which field is invalid for a helpful error message
      const hasMatchingType = validIdentifiers
        .values()
        .some((discovered) => discovered.type === identifier.type);

      if (!hasMatchingType) {
        // Extract expected type(s) from discovered identifiers
        const expectedTypes = [...validIdentifiers.values()].map((d) => d.type);
        const expectedType = expectedTypes[0] ?? 'unknown';
        return err(
          createDataProviderInvalidTypeError({
            expected: expectedType,
            received: identifier.type,
          }),
        );
      }

      // If type matches but id doesn't, it's an invalid id
      const expectedIds = [...validIdentifiers.values()].map((d) => d.id);
      const expectedId = expectedIds[0] ?? 'unknown';
      return err(
        createDataProviderInvalidIdError({
          expected: expectedId,
          received: identifier.id,
        }),
      );
    },
  });
}
