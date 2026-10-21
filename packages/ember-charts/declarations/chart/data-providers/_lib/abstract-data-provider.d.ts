import type { AppError } from '../../../vendor/shared-utils/errors/app-error';
import type { AppErrorArgs } from '../../../vendor/shared-utils/errors/app-error';
import type { DataProviderIdentifier, DataProviderStatic, InferDataProviderIdentifier, InferDataSource } from './abstract-data-provider/types';
import type { DataProviderLike } from './data-provider-like';
import type { BaseChartDataSample, DataProviderCursor, DataStreamIdentifier, DataStreamUpdateBatch } from './data-stream/types';
import type { CreateDataProviderInvalidIdError, CreateDataProviderInvalidTypeError, DataProviderNoCursorForStreamError, DataProviderNoNewDataError, DataProviderUnknownStreamError, DataStreamHasNoDataError } from '../errors';
import type { ChartLayoutFragmentData } from '../../schema/types';
import type { TimeWindow } from './data-stream/time-window';
import Result from 'true-myth/result';
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
 * The static-side type preserves the consumer's source and identity types.
 */
export declare abstract class AbstractDataProvider<TDataProviderStatic extends DataProviderStatic<unknown, AppError<AppErrorArgs>, TContext>, TContext extends object> implements DataProviderLike {
    #private;
    /**
     * Concrete provider identity for this instance (derived from static's discoverIdentifiers).
     */
    readonly identifier: InferDataProviderIdentifier<TDataProviderStatic>;
    /**
     * Human-readable name for this provider instance (the subclasses should set this, e.g., "MarketDataData").
     */
    abstract readonly name: string;
    /**
     * Public accessor for the data source (e.g., IndicatorGroupViewModel, MarketDataDataStreamModel).
     */
    get dataSource(): InferDataSource<TDataProviderStatic>;
    /**
     * Public API: resolve the provider's data stream identifiers.
     *
     * - Exposes the static's dataStreamIdentifiers.
     * - Subclasses with dynamic identifiers may override this getter.
     */
    get dataStreamIdentifiers(): TDataProviderStatic['dataStreamIdentifiers'];
    /**
     * Default layout for this provider's streams. One pane per stream, each with an empty series array.
     *
     * The schema fills in series detail (field paths, visibility) from presenters during assembly. Multi-stream providers
     * (e.g., MarketDataData) override to group related streams into shared panes.
     */
    get defaultLayout(): ChartLayoutFragmentData;
    getDataState({ dataStreamIdentifier, }: {
        dataStreamIdentifier: DataStreamIdentifier;
    }): {
        cursor: DataProviderCursor | undefined;
        dataHash: string | undefined;
        dataLength: number | undefined;
        projectionId: string | undefined;
    };
    groupIdFor({ dataStreamIdentifier, }: {
        dataStreamIdentifier: DataStreamIdentifier;
    }): string;
    /**
     * Stable identity key for layout persistence. Defaults to identifier.id, which is the domain entity ID (e.g., trade
     * position set ID, indicator template provider ID).
     */
    get stableLayoutKey(): string;
    constructor({ dataSource, identifier, }: {
        dataSource: InferDataSource<TDataProviderStatic>;
        identifier: InferDataProviderIdentifier<TDataProviderStatic>;
    });
    /**
     * Returns the provider-maintained cursor for the given stream, if available.
     */
    getCursor({ dataStreamIdentifier: { id: idForCursor }, }: {
        dataStreamIdentifier: DataStreamIdentifier;
    }): Result<DataProviderCursor, DataProviderNoCursorForStreamError | DataProviderUnknownStreamError>;
    /**
     * Returns updates for the given stream since the provided cursor.
     *
     * - Providers must NEVER return empty update sets: Err(DataProviderNoNewDataError) instead.
     * - When 'cursor' is omitted, providers may use internal cursors or perform initial backfill.
     * - Identity fields (dataProviderId/Type/StreamId) are injected automatically.
     */
    getDataSince({ cursor, dataStreamIdentifier, }: {
        cursor?: DataProviderCursor;
        dataStreamIdentifier: DataStreamIdentifier;
    }): Result<DataStreamUpdateBatch<BaseChartDataSample<object, object, DataStreamIdentifier>>, DataProviderNoNewDataError | DataProviderUnknownStreamError>;
    /**
     * Return an example (latest) sample for a specific stream without advancing the internal cursor.
     */
    getExampleDataSampleForStream({ dataStreamIdentifier, }: {
        dataStreamIdentifier: DataStreamIdentifier;
    }): Result<BaseChartDataSample<object, object, DataStreamIdentifier>, DataProviderUnknownStreamError | DataStreamHasNoDataError>;
    /**
     * Return example (latest) samples for all known streams without advancing cursors. Streams with no data are omitted.
     */
    getExampleDataSampleForStreams(): ReadonlyMap<string, BaseChartDataSample<object, object, DataStreamIdentifier>>;
    /**
     * Provider-specific data source (e.g., Set<Tick>).
     */
    protected readonly _dataSource: InferDataSource<TDataProviderStatic>;
    /**
     * Access the subclass static members in a type-safe manner.
     */
    protected abstract readonly staticSide: TDataProviderStatic;
    /**
     * Optional helper for subclasses to clear internal cursor state.
     */
    protected clearInternalCursor(args: {
        streamId: string;
    }): void;
    /**
     * Subclasses must adapt a raw record from the data source into the canonical non-identity portion of a
     * ChartDataSample. The base will inject identity fields automatically.
     */
    protected abstract _dataSampleSourceAdapter(args: {
        dataSampleSource: InstanceType<TDataProviderStatic['dataSampleSource']>;
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
    }): Iterable<InstanceType<TDataProviderStatic['dataSampleSource']>>;
    /**
     * Create a canonical BaseChartDataSample from a provider's raw data source record. Identity fields are injected here.
     */
    protected _makeSampleFromSource({ dataSampleSource, dataStreamIdentifier, }: {
        dataSampleSource: InstanceType<TDataProviderStatic['dataSampleSource']>;
        dataStreamIdentifier: DataStreamIdentifier;
    }): BaseChartDataSample<object, object, DataStreamIdentifier>;
    /**
     * Optional helper for subclasses to set internal cursor state.
     */
    protected setInternalCursor(args: {
        cursor: DataProviderCursor;
        streamId: string;
    }): void;
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
export declare function validateDataProviderIdentifier({ identifier, validIdentifiers, }: {
    identifier: DataProviderIdentifier;
    validIdentifiers: ReadonlySet<DataProviderIdentifier>;
}): Result<true, CreateDataProviderInvalidIdError | CreateDataProviderInvalidTypeError>;
//# sourceMappingURL=abstract-data-provider.d.ts.map