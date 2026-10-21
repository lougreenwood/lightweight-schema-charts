import type { BaseChartDataSample } from '../../data-providers/_lib/data-stream/types';
import type { DataProviderLike } from '../../data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '../../data-providers/_lib/data-stream/types';
import type {
  ChartLayoutFragmentData,
  BaseStructuralDescriptor,
  SeriesPath,
} from '../../schema/types';
import type { ProjectedSeriesPoint } from './abstract-data-stream-presenter/types';
import type { SeriesType } from '../../series-adapters/_lib/_registry/types';
import type { Result } from 'true-myth/result';

import { trackedMap } from '@ember/reactive/collections';
import { humanizeChartFieldLabel } from '../../utils/labels';

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
export abstract class AbstractDataStreamPresenter<
  TDataProvider extends DataProviderLike,
  TDataStreamIdentifier extends DataStreamIdentifier,
  TDataSource,
> {
  /**
   * The data provider instance that owns this presenter's data stream.
   */
  get dataProvider(): TDataProvider {
    return this._dataProvider;
  }

  /**
   * The data stream identifier for this presenter.
   */
  get dataStreamIdentifier(): TDataStreamIdentifier {
    return this._dataStreamIdentifier;
  }

  /**
   * Default field selection derived from descriptors (no samples, no fetch).
   */
  get defaultSeries(): ReadonlySet<SeriesPath> {
    // Use cached descriptors for default selection
    const rootDescriptors = this.structuralDescriptors;
    const selections = new Set<SeriesPath>();

    type Descriptor = BaseStructuralDescriptor<TDataStreamIdentifier>;

    const isSeries = (d: Descriptor): d is Descriptor & { kind: 'series' } =>
      d.kind === 'series';
    const isStructural = (
      d: Descriptor,
    ): d is Descriptor & { kind: 'structural' } => d.kind === 'structural';

    const selectFromStructural = (
      struct: Descriptor & { kind: 'structural' },
    ) => {
      // Meta groups are auxiliary information - don't auto-select
      const fieldPath = struct.identifier.fieldPath as string;
      if (fieldPath === 'meta' || fieldPath.startsWith('meta.')) return;

      const seriesChildren = Array.from(struct.children).filter(isSeries);
      if (seriesChildren.length === 0) return;
      const chosen =
        seriesChildren.find((c) => c.identifier.fieldPath.endsWith('.total')) ??
        seriesChildren[0];
      if (!chosen) return;
      selections.add(chosen.identifier.fieldPath);
    };

    const visit = (descriptor: Descriptor, parentStructural: boolean) => {
      if (isStructural(descriptor)) {
        // Choose one representative child for this group
        selectFromStructural(descriptor);

        // Recurse to nested structural groups
        for (const child of descriptor.children) {
          if (isStructural(child)) visit(child, true);
        }
      } else {
        // Top-level series (not under structural parent): include if under 'data.'
        if (
          !parentStructural &&
          descriptor.identifier.fieldPath.startsWith('data.')
        ) {
          selections.add(descriptor.identifier.fieldPath);
        }
      }
    };

    for (const d of rootDescriptors) visit(d, false);

    return selections;
  }

  /**
   * Default layout fragment for this presenter's data stream.
   *
   * Produces a single pane with a single series group containing all known series fields. Visibility is determined by
   * `defaultSeries` — fields in that set are visible, all others are hidden.
   *
   * Subclasses MAY override to produce multi-pane or multi-group layouts when their data naturally maps to separate
   * panes (e.g., OHLC in main pane, volume in a separate pane).
   */
  get defaultLayout(): ChartLayoutFragmentData {
    const visiblePaths = this.defaultSeries;

    const allSeriesPaths = this.#collectAllSeriesPaths({
      descriptors: this.structuralDescriptors,
    });

    const series = allSeriesPaths
      .values()
      .map((fieldPath: SeriesPath) => ({
        fieldPath,
        visible: visiblePaths.has(fieldPath),
      }))
      .toArray();

    return {
      panes: [
        {
          seriesGroups: [
            {
              groupId: `${this._dataStreamIdentifier.dataProviderIdentifier.id}::${this._dataStreamIdentifier.type}`,
              series,
              stableLayoutKey:
                this._dataStreamIdentifier.dataProviderIdentifier.id,
              streamType: this._dataStreamIdentifier.type,
            },
          ],
        },
      ],
    };
  }

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
  get providerName(): string {
    return this._dataProvider.name;
  }

  /**
   * Read-only view of the tracked cache, returning only root-level descriptors.
   *
   * Filters out descriptors that are children of structural nodes to avoid duplicate display in the UI. Children are
   * accessible via their parent structural descriptor's `children` property.
   *
   * The generic type parameter preserves the specific DataStreamIdentifier type from the presenter's TArgs.
   */
  get structuralDescriptors(): ReadonlySet<
    BaseStructuralDescriptor<TDataStreamIdentifier>
  > {
    const allDescriptors = Array.from(this._structuralDescriptorsMap.values());

    // Collect all field paths that are children of structural descriptors
    const childFieldPaths = new Set<SeriesPath>();

    for (const descriptor of allDescriptors) {
      if (descriptor.kind === 'structural') {
        // Recursively collect all children field paths
        const collectChildPaths = (
          children: ReadonlySet<
            BaseStructuralDescriptor<TDataStreamIdentifier>
          >,
        ) => {
          for (const child of children) {
            childFieldPaths.add(child.identifier.fieldPath);
            if (child.kind === 'structural') {
              collectChildPaths(child.children);
            }
          }
        };
        collectChildPaths(descriptor.children);
      }
    }

    // Return only root-level descriptors (not children of structural nodes)
    return new Set(
      allDescriptors.filter(
        (descriptor) => !childFieldPaths.has(descriptor.identifier.fieldPath),
      ),
    );
  }

  /**
   * Human-readable name for this data stream. Subclasses must implement this reactive getter.
   */
  abstract get streamName(): string;

  constructor({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: TDataProvider;
    dataStreamIdentifier: TDataStreamIdentifier;
  }) {
    this._dataProvider = dataProvider;
    this._dataStreamIdentifier = dataStreamIdentifier;

    // Fetch example sample internally from provider
    const exampleResult = this._dataProvider.getExampleDataSampleForStream({
      dataStreamIdentifier,
    });
    this._exampleDataSample = exampleResult.unwrapOr(undefined);

    // NOTE: Subclasses MUST call _initializeDescriptors() at the end of their constructor
    // after all their fields are initialized. This is not called here because subclasses
    // may need to set up additional state (e.g., delegate presenters) before describeFields() is called.
  }

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
  describeFields(): ReadonlySet<
    BaseStructuralDescriptor<TDataStreamIdentifier>
  > {
    // 1. Get data fields from subclass
    const dataFields = this._describeDataFields();

    // 2. Get meta field children from subclass (raw, not wrapped)
    const presenterMetaChildren = this._describeMetaFieldChildren();

    // 3. Collect paths already covered by presenter
    const coveredPaths = new Set<string>();
    presenterMetaChildren.forEach((descriptor) => {
      this.#collectFieldPaths({ descriptor, paths: coveredPaths });
    });

    // 4. Infer missing meta fields from sample (fallback)
    const metaObject =
      (this._exampleDataSample?.meta as Record<string, unknown>) ?? {};
    const inferredMetaChildren = this.#inferMissingMetaFields({
      coveredPaths,
      metaObject,
      pathPrefix: 'meta',
    });

    // 5. Combine presenter + inferred meta children
    const allMetaChildren = new Set([
      ...inferredMetaChildren,
      ...presenterMetaChildren,
    ]);

    // 6. If no meta children, return just data fields
    if (allMetaChildren.size === 0) {
      return dataFields;
    }

    // 7. Wrap meta children in structural "Meta" node
    const metaStructural: BaseStructuralDescriptor<TDataStreamIdentifier> = {
      children: allMetaChildren,
      kind: 'structural' as const,
      label: 'Meta',
      structuralGroupType: 'faceted' as const,
      identifier: {
        dataStreamIdentifier: this._dataStreamIdentifier,
        fieldPath: 'meta' as SeriesPath,
      },
    };

    // 8. Return combined data + wrapped meta, with data fields first so primary
    // stream series appear before auxiliary Meta fields in selector/tree UIs.
    const orderedDescriptors = new Set<
      BaseStructuralDescriptor<TDataStreamIdentifier>
    >(dataFields);
    orderedDescriptors.add(metaStructural);
    return orderedDescriptors;
  }

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

  projectField({
    dataSamples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >;
    fieldPath: SeriesPath;
  }): ReadonlySet<ProjectedSeriesPoint> {
    // Delegate to subclass hook for actual projection
    // No descriptor enrichment during projection (YAGNI - descriptors are fully seeded at construction)
    return this._projectFieldImplementation({
      dataSamples,
      fieldPath,
    });
  }

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
  protected readonly _exampleDataSample?: BaseChartDataSample<
    object,
    object,
    DataStreamIdentifier
  >;

  /**
   * Tracked cache keyed by fieldPath for efficient lookups and UI reactivity. We store BOTH structural and series
   * descriptors so we can traverse the hierarchy from cached roots.
   */
  private readonly _structuralDescriptorsMap = trackedMap<
    SeriesPath,
    BaseStructuralDescriptor<TDataStreamIdentifier>
  >();

  /**
   * Describe data fields for this data stream.
   *
   * Subclasses return their data field descriptors (e.g., OHLC, volume, indicator values). These are returned directly
   * without additional processing.
   */
  protected abstract _describeDataFields(): ReadonlySet<
    BaseStructuralDescriptor<TDataStreamIdentifier>
  >;

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
  protected abstract _describeMetaFieldChildren(): ReadonlySet<
    BaseStructuralDescriptor<TDataStreamIdentifier>
  >;

  /**
   * Seed static descriptors using the example sample (if available). Subclasses may override to add extra static setup,
   * but should call super.
   */
  protected _ensureStaticSeriesFieldsDescriptors(): void {
    const descriptors = this.describeFields();
    this._mergeDescriptorsIntoCache({ descriptors });
  }

  /**
   * Format field key into human-readable label.
   *
   * Splits camelCase and capitalizes words. E.g., 'bullishCrossover' → 'Bullish Crossover'.
   *
   * @param   key - Field key to format
   *
   * @returns     Human-readable label
   */
  protected _formatLabel(key: string): string {
    return humanizeChartFieldLabel({ fieldName: key });
  }

  /**
   * Format meta field label with 'is' prefix stripping for booleans.
   *
   * Converts 'isBullishCrossover' → 'Bullish Crossover', 'highest' → 'Highest'.
   *
   * @param   key - Field key to format
   *
   * @returns     Human-readable label
   */
  protected _formatMetaFieldLabel(key: string): string {
    const withoutIs = this._stripIsPrefix(key);
    return this._formatLabel(withoutIs);
  }

  /**
   * Infer series kind from value type.
   *
   * Used by fallback inference when presenter doesn't define explicit seriesKind.
   *
   * @param   value - The value to inspect
   *
   * @returns       Inferred series type
   */
  protected _inferSeriesKindFromValue(value: unknown): SeriesType {
    switch (typeof value) {
      case 'boolean':
        return 'baseline'; // Boolean values rendered as 0/1 baseline

      case 'number':
        return 'line';

      default:
        // For objects or other types, default to line (will be handled recursively if nested)
        return 'line';
    }
  }

  /**
   * Initialize descriptors by seeding from describeFields().
   *
   * Subclasses MUST call this at the end of their constructor after all fields are initialized. This is not called
   * automatically in the base constructor because subclasses may need to set up additional state before
   * describeFields() can be called.
   */
  protected _initializeDescriptors(): void {
    this._ensureStaticSeriesFieldsDescriptors();
  }

  /**
   * Merge descriptors into cache. Stores both structural and series nodes; recurses structural children.
   */
  protected _mergeDescriptorsIntoCache({
    descriptors,
  }: {
    descriptors: ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
  }): void {
    for (const descriptor of descriptors) {
      this._structuralDescriptorsMap.set(
        descriptor.identifier.fieldPath,
        descriptor,
      );

      if (descriptor.kind === 'structural') {
        this._mergeDescriptorsIntoCache({ descriptors: descriptor.children });
      }
    }
  }

  /**
   * Subclass hook for projection. Implementors should project the requested field using the provided samples.
   */
  protected abstract _projectFieldImplementation(args: {
    dataSamples: ReadonlySet<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >;
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
  protected _stripIsPrefix(key: string): string {
    if (
      key.startsWith('is') &&
      key.length > 2 &&
      key[2] === key[2]?.toUpperCase()
    ) {
      return key.slice(2);
    }
    return key;
  }

  /**
   * Recursively collect all field paths from a descriptor tree.
   *
   * Used to track which paths are already covered by presenter-defined descriptors.
   */
  #collectFieldPaths({
    descriptor,
    paths,
  }: {
    descriptor: BaseStructuralDescriptor<TDataStreamIdentifier>;
    paths: Set<string>;
  }): void {
    paths.add(descriptor.identifier.fieldPath);

    if (descriptor.kind === 'structural') {
      descriptor.children.forEach((child) => {
        this.#collectFieldPaths({ descriptor: child, paths });
      });
    }
  }

  /**
   * Infer meta field descriptors for fields NOT already covered by the presenter.
   *
   * Recursively inspects the meta object and creates generic descriptors for uncovered fields. This ensures data
   * integrity - new meta fields won't be silently dropped when presenters drift out of sync with the data source.
   */
  #inferMissingMetaFields({
    coveredPaths,
    depth = 0,
    metaObject,
    pathPrefix,
  }: {
    coveredPaths: ReadonlySet<string>;
    depth?: number;
    metaObject: Record<string, unknown>;
    pathPrefix: string;
  }): ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>> {
    // Safety: limit recursion depth
    if (depth > 10) {
      return new Set();
    }

    return Object.keys(metaObject).reduce((descriptors, key) => {
      const fieldPath = `${pathPrefix}.${key}` as SeriesPath;
      const value = metaObject[key];

      // Skip if already covered by presenter
      if (coveredPaths.has(fieldPath)) {
        return descriptors;
      }

      // Skip non-renderable types
      if (value instanceof Date || value === null || value === undefined) {
        return descriptors;
      }

      // Handle nested objects recursively
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedObject = value as Record<string, unknown>;
        const nestedKeys = Object.keys(nestedObject);

        if (nestedKeys.length > 0) {
          const children = this.#inferMissingMetaFields({
            coveredPaths,
            depth: depth + 1,
            metaObject: nestedObject,
            pathPrefix: fieldPath,
          });

          if (children.size > 0) {
            return descriptors.add({
              children,
              kind: 'structural' as const,
              label: this._formatMetaFieldLabel(key),
              structuralGroupType: 'faceted' as const,
              identifier: {
                dataStreamIdentifier: this._dataStreamIdentifier,
                fieldPath,
              },
            });
          }
        }
        return descriptors;
      }

      // Leaf field - infer series kind from value type
      const seriesKind = this._inferSeriesKindFromValue(value);
      const label = this._formatMetaFieldLabel(key);

      return descriptors.add({
        kind: 'series' as const,
        label,
        seriesKind,
        identifier: {
          dataStreamIdentifier: this._dataStreamIdentifier,
          fieldPath,
        },
      });
    }, new Set<BaseStructuralDescriptor<TDataStreamIdentifier>>());
  }

  /**
   * Recursively collect all series field paths from a set of descriptors.
   *
   * Walks structural nodes to extract leaf series paths for layout assembly.
   */
  #collectAllSeriesPaths({
    descriptors,
  }: {
    descriptors: ReadonlySet<BaseStructuralDescriptor<TDataStreamIdentifier>>;
  }): Set<SeriesPath> {
    return descriptors.values().reduce((paths, descriptor) => {
      if (descriptor.kind === 'series') {
        paths.add(descriptor.identifier.fieldPath);
      } else {
        const childPaths = this.#collectAllSeriesPaths({
          descriptors: descriptor.children,
        });
        for (const path of childPaths) {
          paths.add(path);
        }
      }
      return paths;
    }, new Set<SeriesPath>());
  }
}
