import type { DataProviderLike } from '../../data-providers/_lib/data-provider-like';
import type { BaseChartDataSample, DataStreamIdentifier } from '../../data-providers/_lib/data-stream/types';
import type { ChartLayoutFragmentData, BaseStructuralDescriptor, SeriesPath } from '../../schema/types';
import type { ProjectedSeriesPoint } from './abstract-data-stream-presenter/types';
import type { Result } from 'true-myth/result';
/**
 * DataStreamPresenterLike
 *
 * Discriminated union describing the public contract for all data stream presenters. This interface captures "what a
 * presenter does" rather than "what it is", enabling:
 *
 * - Decoupling: Consumers depend on the interface, not the AbstractDataStreamPresenter class
 * - Testability: Easy to create test doubles that implement the interface
 * - Flexibility: Multiple implementations possible without inheritance
 * - Cleaner types: Factory return types reference the interface, not the abstract class
 * - Type narrowing: Use `isConfigurable` to narrow to ConfigurableDataStreamPresenterLike and access data source
 *
 * The AbstractDataStreamPresenter class satisfies this interface, and all concrete presenters inherit from it. However,
 * external code (factories, registries, consumers) should reference DataStreamPresenterLike rather than
 * AbstractDataStreamPresenter.
 *
 * Note: This interface is intentionally non-generic. The `AbstractDataStreamPresenter<TDataSource>` class is generic
 * and preserves the full data source type, but when passed around as `DataStreamPresenterLike`, the data source is
 * type-erased to `HasConfigValues` for configurable presenters. This allows uniform handling without requiring
 * consumers to know the specific data source type.
 *
 * @example
 *
 * ```ts
 * function handlePresenter(presenter: DataStreamPresenterLike) {
 *   if (presenter.isConfigurable) {
 *     // TypeScript narrows to ConfigurableDataStreamPresenterLike
 *     const dataSourceResult = presenter.getStreamDataSource();
 *     dataSourceResult.match({
 *       Ok: (dataSource) => {
 *         // Access config: dataSource.config
 *       },
 *       Err: (error) => {
 *         // Handle error (won't happen for configurable presenters)
 *       },
 *     });
 *   }
 * }
 * ```
 *
 * Consumer provider and stream types can be narrowed directly.
 */
export type DataStreamPresenterLike<TDataProvider extends DataProviderLike, TDataStreamIdentifier extends DataStreamIdentifier> = ConfigurableDataStreamPresenterLike<TDataProvider, TDataStreamIdentifier> | NonConfigurableDataStreamPresenterLike<TDataProvider, TDataStreamIdentifier>;
/**
 * HasConfigValues
 *
 * Minimal interface for data sources that have configuration. Used as a type constraint to determine whether a data
 * stream presenter is configurable.
 *
 * This is intentionally minimal — it only requires a `configValues` property. Concrete data sources (like
 * `IndicatorModelLike`) will have additional properties, but non-form trading-chart consumers only need the canonical
 * config-values handle.
 */
export interface HasConfigValues {
    readonly configValues: unknown;
}
/**
 * BaseDataStreamPresenterLike
 *
 * Common interface shared by all data stream presenters. Contains all properties and methods except configurability,
 * which is handled by the discriminated union.
 *
 * Keeps the consumer's provider and stream identity types.
 */
interface BaseDataStreamPresenterLike<TDataProvider extends DataProviderLike, TDataStreamIdentifier extends DataStreamIdentifier> {
    /**
     * The data provider instance that owns this presenter's data stream.
     */
    readonly dataProvider: TDataProvider;
    /**
     * The data stream identifier for this presenter.
     */
    readonly dataStreamIdentifier: TDataStreamIdentifier;
    /**
     * Default layout fragment (Level 1) for this presenter's data stream. Used by the reactive schema to assemble the
     * chart layout. Describes panes and series groups with default visibility derived from defaultSeries.
     */
    readonly defaultLayout: ChartLayoutFragmentData;
    /**
     * Default series to select on initialization (derived from descriptors). Rules:
     *
     * - Include top-level series whose fieldPath starts with 'data.' (not under a structural group).
     * - For each structural group:
     *
     *   - Prefer a child ending in '.total' if present; otherwise the first series child.
     *   - Recurse into nested structural groups and apply the same rule.
     */
    readonly defaultSeries: ReadonlySet<SeriesPath>;
    /**
     * Human-readable name for the provider that owns this data stream.
     */
    readonly providerName: string;
    /**
     * Tracked cache of field descriptors for UI shape reads (side-effect free). The generic type parameter preserves the
     * specific DataStreamIdentifier type from the presenter's TArgs, enabling type-safe access to the identifier
     * throughout the descriptor chain.
     */
    readonly structuralDescriptors: ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Human-readable name for this data stream (e.g., "EMA Short", "OHLC", "Volume"). Reactive getter.
     */
    readonly streamName: string;
    /**
     * Hierarchical description of fields (structural + series), metadata-only. Must be safe to call without any samples
     * (no fetching, no cursor movement). The generic type parameter preserves the specific DataStreamIdentifier type.
     */
    describeFields(): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Project field data without imposing adapter value semantics.
     */
    projectField(args: {
        dataSamples: ReadonlySet<BaseChartDataSample<object, object, DataStreamIdentifier>>;
        fieldPath: SeriesPath;
    }): ReadonlySet<ProjectedSeriesPoint>;
}
/**
 * ConfigurableDataStreamPresenterLike
 *
 * Presenter for data streams that support configuration (e.g., indicator streams). The `getStreamDataSource()` method
 * returns a data source with configuration when called, guaranteed by the `isConfigurable: true` discriminator.
 *
 * The configurable data-source contract is consumer supplied.
 */
export interface ConfigurableDataStreamPresenterLike<TDataProvider extends DataProviderLike, TDataStreamIdentifier extends DataStreamIdentifier> extends BaseDataStreamPresenterLike<TDataProvider, TDataStreamIdentifier> {
    /**
     * Discriminator indicating this presenter's data stream supports configuration.
     */
    readonly isConfigurable: true;
    /**
     * Get the configurable data source for this data stream.
     *
     * For configurable presenters, this always returns Ok with a data source that has configuration.
     *
     * Note: The return type is `HasConfigValues` (type-erased) at the interface level. Concrete implementations
     * (`AbstractDataStreamPresenter<TDataSource>`) preserve the full `TDataSource` type.
     */
    getStreamDataSource(): Result<HasConfigValues, never>;
}
/**
 * NonConfigurableDataStreamPresenterLike
 *
 * Presenter for data streams that do not support configuration (e.g., ticker streams). The data source exists but does
 * not have a `configValues` property.
 *
 * The data source need not expose configuration.
 */
export interface NonConfigurableDataStreamPresenterLike<TDataProvider extends DataProviderLike, TDataStreamIdentifier extends DataStreamIdentifier> extends BaseDataStreamPresenterLike<TDataProvider, TDataStreamIdentifier> {
    /**
     * Discriminator indicating this presenter's data stream does not support configuration.
     */
    readonly isConfigurable: false;
    /**
     * Get the data source for this data stream.
     *
     * For non-configurable presenters, this returns the data source without configuration. The data source exists but
     * does not satisfy `HasConfigValues`.
     */
    getStreamDataSource(): Result<unknown, never>;
}
export {};
//# sourceMappingURL=data-stream-presenter-like.d.ts.map