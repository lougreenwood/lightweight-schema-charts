import type { BaseChartDataSample } from '../../data-providers/_lib/data-stream/types';
import type { DataProviderLike } from '../../data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '../../data-providers/_lib/data-stream/types';
import type { ChartLayoutFragmentData, BaseStructuralDescriptor, SeriesPath } from '../../schema/types';
import type { ProjectedSeriesPoint } from './abstract-data-stream-presenter/types';
import type { SeriesType } from '../../series-adapters/_lib/_registry/types';
import type { Result } from 'true-myth/result';
/**
 * AbstractDataStreamPresenter
 *
 * Provides tracked descriptor caching, seeding, and default field selection logic. Subclasses must implement describing
 * and projecting; all shape reads should be side-effect free.
 *
 * Pipeline architecture:
 *
 * - DescribeFields() [concrete] - Orchestrates the full pipeline:
 *
 *   1. Calls _describeDataFields() for data field descriptors
 *   2. Calls _describeMetaFieldChildren() for meta field children (raw, not wrapped)
 *   3. Infers missing meta fields from sample data (fallback)
 *   4. Wraps meta children in structural "Meta" node
 *   5. Returns combined data + wrapped meta
 * - _describeDataFields() [abstract] - Subclass returns data field descriptors
 * - _describeMetaFieldChildren() [abstract] - Subclass returns raw meta children (NOT wrapped in structural node)
 *
 * Descriptors are seeded once at construction from the optional example sample. No enrichment happens during projection
 * (YAGNI - we don't anticipate sparse data streams without data at init).
 *
 * Configurability via isConfigurable:
 *
 * The `isConfigurable` discriminator determines whether the presenter's data source supports configuration:
 *
 * - If `isConfigurable: true` → `getStreamDataSource()` returns a data source with `config` property
 * - If `isConfigurable: false` → `getStreamDataSource()` returns a data source without `config` property
 *
 * Subclasses MUST implement `isConfigurable` and `getStreamDataSource()` to satisfy the DataStreamPresenterLike
 * discriminated union. The abstract class does not implement DataStreamPresenterLike directly (TypeScript cannot
 * implement union types), but concrete subclasses must satisfy one branch of the union.
 *
 * Consumer types are preserved directly through the provider, stream, and data-source parameters.
 */
export declare abstract class AbstractDataStreamPresenter<TDataProvider extends DataProviderLike, TDataStreamIdentifier extends DataStreamIdentifier, TDataSource> {
    #private;
    /**
     * The data provider instance that owns this presenter's data stream.
     */
    get dataProvider(): TDataProvider;
    /**
     * The data stream identifier for this presenter.
     */
    get dataStreamIdentifier(): TDataStreamIdentifier;
    /**
     * Default field selection derived from descriptors (no samples, no fetch).
     */
    get defaultSeries(): ReadonlySet<SeriesPath>;
    /**
     * Default layout fragment for this presenter's data stream.
     *
     * Produces a single pane with a single series group containing all known series fields. Visibility is determined by
     * `defaultSeries` — fields in that set are visible, all others are hidden.
     *
     * Subclasses MAY override to produce multi-pane or multi-group layouts when their data naturally maps to separate
     * panes (e.g., OHLC in main pane, volume in a separate pane).
     */
    get defaultLayout(): ChartLayoutFragmentData;
    /**
     * Whether this presenter's data stream supports configuration.
     *
     * Subclasses MUST implement this to satisfy the DataStreamPresenterLike discriminated union:
     *
     * - If the presenter has a configurable data source → return `true`
     * - If the presenter has no data source → return `false`
     *
     * This discriminator enables TypeScript to narrow the return type of `getStreamDataSource()`.
     */
    abstract get isConfigurable(): boolean;
    /**
     * Human-readable name for the provider that owns this data stream.
     */
    get providerName(): string;
    /**
     * Read-only view of the tracked cache, returning only root-level descriptors.
     *
     * Filters out descriptors that are children of structural nodes to avoid duplicate display in the UI. Children are
     * accessible via their parent structural descriptor's `children` property.
     *
     * The generic type parameter preserves the specific DataStreamIdentifier type from the presenter's TArgs.
     */
    get structuralDescriptors(): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Human-readable name for this data stream. Subclasses must implement this reactive getter.
     */
    abstract get streamName(): string;
    constructor({ dataProvider, dataStreamIdentifier, }: {
        dataProvider: TDataProvider;
        dataStreamIdentifier: TDataStreamIdentifier;
    });
    /**
     * Describe all fields for this data stream.
     *
     * Concrete implementation that orchestrates the full pipeline:
     *
     * 1. Get data fields from subclass
     * 2. Get meta field children from subclass
     * 3. Infer missing meta fields from sample (fallback)
     * 4. Wrap meta in structural "Meta" node
     * 5. Return combined result
     *
     * The generic type parameter preserves the specific DataStreamIdentifier type from the presenter's TArgs.
     */
    describeFields(): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Get the data source for this data stream.
     *
     * Subclasses MUST implement this to satisfy the DataStreamPresenterLike discriminated union:
     *
     * - If configurable → return `Result.ok(dataSource)` where dataSource satisfies `HasConfigValues`
     * - If not configurable → return `Result.ok(dataSource)` where dataSource is the stream's data source (no config)
     *
     * The `isConfigurable` discriminator enables type narrowing at the interface level.
     */
    abstract getStreamDataSource(): Result<TDataSource, never>;
    projectField({ dataSamples, fieldPath, }: {
        dataSamples: ReadonlySet<BaseChartDataSample<object, object, DataStreamIdentifier>>;
        fieldPath: SeriesPath;
    }): ReadonlySet<ProjectedSeriesPoint>;
    /**
     * Protected data provider for subclasses.
     */
    protected readonly _dataProvider: TDataProvider;
    /**
     * Protected stream identifier for subclasses.
     */
    protected readonly _dataStreamIdentifier: TDataStreamIdentifier;
    /**
     * Protected example data sample for descriptor inference (if available).
     */
    protected readonly _exampleDataSample?: BaseChartDataSample<object, object, DataStreamIdentifier>;
    /**
     * Tracked cache keyed by fieldPath for efficient lookups and UI reactivity. We store BOTH structural and series
     * descriptors so we can traverse the hierarchy from cached roots.
     */
    private readonly _structuralDescriptorsMap;
    /**
     * Describe data fields for this data stream.
     *
     * Subclasses return their data field descriptors (e.g., OHLC, volume, indicator values). These are returned directly
     * without additional processing.
     */
    protected abstract _describeDataFields(): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Describe meta field children for this data stream.
     *
     * Subclasses return raw meta field descriptors (NOT wrapped in structural "Meta" node). The base class pipeline will:
     *
     * - Infer any missing meta fields from sample data
     * - Wrap all meta children in a structural "Meta" node
     *
     * Return an empty set if this stream has no meta fields.
     */
    protected abstract _describeMetaFieldChildren(): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    /**
     * Seed static descriptors using the example sample (if available). Subclasses may override to add extra static setup,
     * but should call super.
     */
    protected _ensureStaticSeriesFieldsDescriptors(): void;
    /**
     * Format field key into human-readable label.
     *
     * Splits camelCase and capitalizes words. E.g., 'bullishCrossover' → 'Bullish Crossover'.
     *
     * @param   key - Field key to format
     *
     * @returns     Human-readable label
     */
    protected _formatLabel(key: string): string;
    /**
     * Format meta field label with 'is' prefix stripping for booleans.
     *
     * Converts 'isBullishCrossover' → 'Bullish Crossover', 'highest' → 'Highest'.
     *
     * @param   key - Field key to format
     *
     * @returns     Human-readable label
     */
    protected _formatMetaFieldLabel(key: string): string;
    /**
     * Infer series kind from value type.
     *
     * Used by fallback inference when presenter doesn't define explicit seriesKind.
     *
     * @param   value - The value to inspect
     *
     * @returns       Inferred series type
     */
    protected _inferSeriesKindFromValue(value: unknown): SeriesType;
    /**
     * Initialize descriptors by seeding from describeFields().
     *
     * Subclasses MUST call this at the end of their constructor after all fields are initialized. This is not called
     * automatically in the base constructor because subclasses may need to set up additional state before
     * describeFields() can be called.
     */
    protected _initializeDescriptors(): void;
    /**
     * Merge descriptors into cache. Stores both structural and series nodes; recurses structural children.
     */
    protected _mergeDescriptorsIntoCache({ descriptors, }: {
        descriptors: ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
    }): void;
    /**
     * Subclass hook for projection. Implementors should project the requested field using the provided samples.
     */
    protected abstract _projectFieldImplementation(args: {
        dataSamples: ReadonlySet<BaseChartDataSample<object, object, DataStreamIdentifier>>;
        fieldPath: SeriesPath;
    }): ReadonlySet<ProjectedSeriesPoint>;
    /**
     * Strip 'is' prefix from field names for boolean fields.
     *
     * Converts 'isBullishCrossover' → 'BullishCrossover'. Only strips when followed by uppercase letter.
     *
     * @param   key - Field name to process
     *
     * @returns     Field name with 'is' prefix stripped if applicable
     */
    protected _stripIsPrefix(key: string): string;
}
//# sourceMappingURL=abstract-data-stream-presenter.d.ts.map