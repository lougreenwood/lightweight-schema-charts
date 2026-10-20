/**
 * ReactiveChartSchema
 *
 * Reactive replacement for the imperative ChartSchema. Layout is derived from data provider/presenter membership rather
 * than maintained via manual add/remove calls. Stale state is structurally impossible because everything derives from
 * live data.
 *
 * Three levels of layout:
 *
 * 1. Layout Fragments — Provider-level, anonymous (from provider.defaultLayout)
 * 2. Default Layout — Schema-assembled from fragments, tagged with stableLayoutKey
 * 3. Actual Layout — User-modified (toggles, reorder), owned by ChartLayout class
 *
 * The reactive schema does NOT touch chart DOM. It produces layout state that the adapter (Layer 3) reads and syncs to
 * LWC APIs.
 *
 * The schema does NOT own domain-specific data (market data samples, tradable asset pair names, timeframe labels).
 * Those concerns belong upstream on the component or interactions layer. The schema receives a `getDataProviders`
 * callback and derives everything from the returned provider set.
 */

import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '#src/chart/data-providers/_lib/data-stream/types';
import type {
  DataStreamPresenterLike,
  DataStreamPresenterLikeTArgs,
} from '#src/chart/data-stream-presenters/_lib/data-stream-presenter-like';
import type { DataStreamPresenterRegistry } from '../../../../../../../../../data-stream-presenters/_lib/data-stream-presenter-registry';
import type {
  BaseStructuralDescriptor,
  ChartLayoutData,
  ChartLayoutOverlaySnapshot,
  ChartState,
  GroupId,
  PaneLayout,
  PaneState,
  PerStreamDataState,
  SeriesGroupLayout,
  SeriesGroupState,
  SeriesIdentifier,
  SeriesLayout,
  SeriesPath,
  SeriesState,
} from '#src/chart/schema/types';

import { cached } from '@glimmer/tracking';
import {
  ChartLayout,
  type ChartLayoutToggleSeriesError,
} from '#src/chart/schema/chart-layout';
import {
  type ChartSchemaPresenterNotFoundError,
  createPresenterNotFoundError,
} from '#src/chart/schema/errors';
import { err, ok, type Result } from 'true-myth/result';

export class ReactiveChartSchema {
  /**
   * Reactive getter: flat map of all data streams to their owning providers.
   *
   * Reactivity source: `#getDataProviders()` reads tracked args (e.g., `this.args.marketDataDataStream`,
   * `this.args.indicatorProviders`). When provider instances change (timeframe change → new TPS → new providers), Ember
   * autotracking invalidates this getter.
   *
   * Key: DataStreamIdentifier (globally unique — contains dataProviderIdentifier + stream id/type) Value: Owning
   * DataProviderLike instance
   */
  @cached
  get dataProviderMap(): ReadonlyMap<DataStreamIdentifier, DataProviderLike> {
    const providers = this.#getDataProviders();

    return providers
      .values()
      .flatMap((dataProvider) =>
        dataProvider.dataStreamIdentifiers
          .values()
          .map(
            (dataStreamIdentifier) =>
              [dataStreamIdentifier, dataProvider] as const,
          ),
      )
      .reduce((map, [dataStreamIdentifier, dataProvider]) => {
        map.set(dataStreamIdentifier, dataProvider);
        return map;
      }, new Map<DataStreamIdentifier, DataProviderLike>());
  }

  /**
   * Full set of data providers, including those with no streams (e.g., empty indicator providers).
   *
   * Consumers that need the complete provider inventory (such as the series selector) use this getter. Stream-centric
   * consumers should use `dataProviderMap` or `presenters` instead.
   */
  get dataProviders(): ReadonlySet<DataProviderLike> {
    return this.#getDataProviders();
  }

  /**
   * The ChartLayout instance (Level 3 — actual layout with user modifications).
   *
   * Exposes the layout class so callers can access the mutation API (e.g., `toggleSeries`). The schema itself reads
   * `this.#chartLayout.layout` reactively for the enriched tree derivation.
   */
  get layout(): ChartLayout {
    return this.#chartLayout;
  }

  /**
   * Reactive getter: resolve presenters for all active streams.
   *
   * Returns the same public surface as v1's `presenters` getter (ReadonlyMap<streamKey, DataStreamPresenterLike>).
   * Reactivity flows from dataProviderMap → inline presenter creation.
   */
  @cached
  get presenters(): ReadonlyMap<string, DataStreamPresenterLike> {
    return this.dataProviderMap
      .entries()
      .map(([dataStreamIdentifier, dataProvider]) => {
        const streamKey = this.#makeDataStreamKey({
          dataProvider,
          dataStreamIdentifier,
        });
        const presenter = this.#makePresenter({
          dataProvider,
          dataStreamIdentifier,
        });

        // Track naming dependencies so selector consumers invalidating off `presenters`
        // update when indicator instance names/provider labels change.
        void presenter.streamName;
        void presenter.providerName;

        return [streamKey, presenter] as const;
      })
      .reduce((map, [key, presenter]) => {
        map.set(key, presenter);
        return map;
      }, new Map<string, DataStreamPresenterLike>());
  }

  /**
   * Reactive getter: derive selected series from the current layout.
   *
   * Returns Map<streamKey, Map<SeriesPath, true>> — same public surface as v1's `selectedSeries`.
   */
  get selectedSeries(): Map<string, Map<SeriesPath, true>> {
    const result = new Map<string, Map<SeriesPath, true>>();

    for (const pane of this.#chartLayout.layout.panes) {
      for (const group of pane.seriesGroups) {
        const dataStreamIdentifier = this.#findDataStreamIdentifierForGroup({
          group,
        });
        const streamKey =
          dataStreamIdentifier === undefined
            ? undefined
            : this.#findStreamKeyForDataStreamIdentifier({
                dataStreamIdentifier,
              });

        if (streamKey === undefined) {
          continue;
        }

        const visibleFields = group.series
          .filter((s) => s.visible)
          .reduce((fields, s) => {
            fields.set(s.fieldPath, true);
            return fields;
          }, new Map<SeriesPath, true>());

        if (visibleFields.size > 0) {
          const existing = result.get(streamKey);
          if (existing) {
            visibleFields.entries().forEach(([k, v]) => existing.set(k, v));
          } else {
            result.set(streamKey, visibleFields);
          }
        }
      }
    }

    return result;
  }

  /**
   * Enriched tree: crosses the provider inventory with the layout overlay to produce a fully-resolved, read-only
   * snapshot for the chart adapter (Layer 3).
   *
   * Reactivity sources: `dataProviderMap` (tracked via getDataProviders callback) and `#chartLayout.layout` (@tracked).
   *
   * Walks the layout — the layout is the source of truth for what is shown and how it's arranged. For each layout
   * group, looks up the matching provider/stream from a membership lookup to enrich it. Layout entries with no matching
   * membership entry are inert (provider disappeared) and skipped.
   *
   * Indicator-specific data state (projectionId, dataHash) is derived via type guard narrowing on the provider.
   */
  get state(): ChartState {
    const providerMap = this.dataProviderMap;
    const layout = this.#chartLayout.layout;

    // Build a fast lookup from live stream id first, then fall back to stable group identity.
    const membershipLookup = providerMap.entries().reduce(
      (lookup, [dataStreamIdentifier, dataProvider]) => {
        lookup.byDataStreamId.set(dataStreamIdentifier.id, {
          dataProvider,
          dataStreamIdentifier,
        });

        const groupId = this.#makeGroupId({
          dataProvider,
          dataStreamIdentifier,
        });
        lookup.byGroupId.set(groupId, { dataProvider, dataStreamIdentifier });

        return lookup;
      },
      {
        byGroupId: new Map<
          GroupId,
          {
            dataProvider: DataProviderLike;
            dataStreamIdentifier: DataStreamIdentifier;
          }
        >(),
        byDataStreamId: new Map<
          string,
          {
            dataProvider: DataProviderLike;
            dataStreamIdentifier: DataStreamIdentifier;
          }
        >(),
      },
    );

    // Walk the layout — the layout is the source of truth for what is shown and how it's arranged.
    // For each layout group, look up the matching provider/stream from membership to enrich it.
    // Layout entries with no matching membership entry are inert (provider disappeared) and skipped.
    const panes: PaneState[] = layout.panes
      .values()
      .map((pane) => {
        const seriesGroups = pane.seriesGroups
          .values()
          .reduce((groups, group) => {
            const entry =
              (group.dataStreamId === undefined
                ? undefined
                : membershipLookup.byDataStreamId.get(group.dataStreamId)) ??
              (group.groupId === undefined
                ? undefined
                : membershipLookup.byGroupId.get(group.groupId));

            if (!entry) {
              return groups;
            }

            const { dataProvider, dataStreamIdentifier } = entry;
            const presenter = this.#makePresenter({
              dataProvider,
              dataStreamIdentifier,
            });
            const series: ReadonlyArray<SeriesState> = group.series.map(
              ({ fieldPath, visible }) => ({
                fieldPath,
                visible,
              }),
            );

            if (!series.some(({ visible }) => visible)) {
              return groups;
            }

            const dataState = this.#deriveDataState({
              dataProvider,
              dataStreamIdentifier,
            });

            groups.push({
              dataState,
              dataStreamIdentifier,
              groupId: this.#makeGroupId({
                dataProvider,
                dataStreamIdentifier,
              }),
              presenter,
              priceScale: group.priceScale,
              provider: dataProvider,
              series,
              stableLayoutKey: group.stableLayoutKey,
              streamType: group.streamType,
            });
            return groups;
          }, [] as SeriesGroupState[]);

        return { seriesGroups };
      })
      .filter((pane) => pane.seriesGroups.length > 0)
      .toArray();

    // Track label dependencies for chart adapter consumers that read `schema.state`.
    // This ensures name-only changes (instance/provider labels) invalidate state
    // even when no structural or data-shape changes occurred.
    panes.values().forEach((pane) => {
      pane.seriesGroups.values().forEach((group) => {
        void group.presenter.streamName;
        void group.provider.name;
      });
    });

    return { panes };
  }

  constructor({
    dataStreamPresenterRegistry,
    getDataProviders,
    initialLayoutOverlay,
  }: {
    dataStreamPresenterRegistry: DataStreamPresenterRegistry;
    initialLayoutOverlay?: ChartLayoutOverlaySnapshot;
    getDataProviders: () => ReadonlySet<DataProviderLike>;
  }) {
    this.#getDataProviders = getDataProviders;
    this.#dataStreamPresenterRegistry = dataStreamPresenterRegistry;

    this.#chartLayout = new ChartLayout({
      initialOverlay: initialLayoutOverlay,
      getDefaultLayout: () => this.#defaultLayout,
      resolveGroupId: ({ dataStreamIdentifier }) =>
        this.#resolveGroupId({ dataStreamIdentifier }),
    });
  }

  /**
   * Look up a presenter by its data stream identifier.
   *
   * Walks dataProviderMap to find the matching provider, creates the presenter inline. Same public surface as v1
   * ChartSchema.getPresenterForStream.
   */
  getPresenterForStream<TDataStreamId extends DataStreamIdentifier>({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: TDataStreamId;
  }): Result<
    DataStreamPresenterLike<
      DataStreamPresenterLikeTArgs & {
        readonly dataStreamIdentifier?: TDataStreamId;
      }
    >,
    ChartSchemaPresenterNotFoundError
  > {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (
        streamId.type === dataStreamIdentifier.type &&
        streamId.id === dataStreamIdentifier.id
      ) {
        const presenter = this.#makePresenter({
          dataProvider,
          dataStreamIdentifier: streamId,
        });

        return ok(
          presenter as DataStreamPresenterLike<
            DataStreamPresenterLikeTArgs & {
              readonly dataStreamIdentifier?: TDataStreamId;
            }
          >,
        );
      }
    }

    // Build a fallback stream key for the error message
    const fallbackKey = `${dataStreamIdentifier.dataProviderIdentifier.type}-${dataStreamIdentifier.dataProviderIdentifier.id}-${dataStreamIdentifier.type}-${dataStreamIdentifier.id}`;
    return err(createPresenterNotFoundError({ streamKey: fallbackKey }));
  }

  /**
   * Toggle visibility of a specific series field. Delegates to ChartLayout.
   *
   * Returns Result — the layout mutation triggers Ember tracking, which recomputes `state` downstream.
   */
  toggleSeries({
    identifier,
  }: {
    identifier: SeriesIdentifier;
  }): Result<true, ChartLayoutToggleSeriesError> {
    return this.#chartLayout.toggleSeries({ identifier }).match({
      Err: (error) => err(error),
      Ok: (value) => ok(value),
    });
  }

  readonly #chartLayout: ChartLayout;
  readonly #dataStreamPresenterRegistry: DataStreamPresenterRegistry;
  readonly #getDataProviders: () => ReadonlySet<DataProviderLike>;

  /**
   * Derived default layout (Level 2) — recomputed when providers change.
   *
   * Walks providers from getDataProviders(), takes each provider's `defaultLayout` fragment (which declares pane
   * structure and stream type groupings with empty series arrays), tags each group with stableLayoutKey, then fills in
   * series detail (field paths + visibility) from the matching stream's presenter.
   *
   * This is the Layer A input to ChartLayout's two-layer composition. Called via the `getDefaultLayout` callback passed
   * to ChartLayout. Reactivity flows through ChartLayout's `@cached layout` getter — when `#getDataProviders()` reads
   * tracked state upstream, ChartLayout's getter invalidates and re-calls this method.
   */
  get #defaultLayout(): ChartLayoutData {
    const providers = this.#getDataProviders();
    const allPanes: PaneLayout[] = [];

    for (const dataProvider of providers) {
      const fragment = dataProvider.defaultLayout;
      const declaredStreamTypes = fragment.panes
        .values()
        .reduce((streamTypes, pane) => {
          pane.seriesGroups
            .values()
            .forEach(({ streamType }) => streamTypes.add(streamType));
          return streamTypes;
        }, new Set<string>());

      // Tag fragment with stableLayoutKey and fill in series from presenters
      const filledPanes = fragment.panes.map((pane) => {
        const seriesGroups = pane.seriesGroups.map((group) => {
          const matchingStream = this.#findDataStreamIdentifierForDefaultGroup({
            dataProvider,
            group,
          });

          if (!matchingStream) {
            return {
              ...group,
              groupId: `${dataProvider.stableLayoutKey}::${group.streamType}`,
              stableLayoutKey: dataProvider.stableLayoutKey,
            };
          }

          const presenter = this.#makePresenter({
            dataProvider,
            dataStreamIdentifier: matchingStream,
          });

          return {
            dataStreamId: matchingStream.id,
            groupId: this.#makeGroupId({
              dataProvider,
              dataStreamIdentifier: matchingStream,
            }),
            priceScale: group.priceScale,
            series: this.#resolveSeriesFromPresenter({ presenter }),
            stableLayoutKey: dataProvider.stableLayoutKey,
            streamType: group.streamType,
          };
        });

        return {
          ...(pane.sortPriority !== undefined
            ? { sortPriority: pane.sortPriority }
            : {}),
          seriesGroups,
        } satisfies PaneLayout;
      });

      const hiddenFallbackPanes = dataProvider.dataStreamIdentifiers
        .values()
        .filter(
          (dataStreamIdentifier) =>
            !declaredStreamTypes.has(dataStreamIdentifier.type),
        )
        .map((dataStreamIdentifier) =>
          this.#buildHiddenFallbackPane({
            dataProvider,
            dataStreamIdentifier,
          }),
        )
        .toArray();

      allPanes.push(...filledPanes, ...hiddenFallbackPanes);
    }

    return { panes: allPanes };
  }

  #buildHiddenFallbackPane({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): PaneLayout {
    const presenter = this.#makePresenter({
      dataProvider,
      dataStreamIdentifier,
    });

    return {
      seriesGroups: [
        {
          dataStreamId: dataStreamIdentifier.id,
          groupId: this.#makeGroupId({ dataProvider, dataStreamIdentifier }),
          stableLayoutKey: dataProvider.stableLayoutKey,
          streamType: dataStreamIdentifier.type,
          series: this.#resolveSeriesFromPresenter({ presenter }).map(
            ({ fieldPath }) => ({
              fieldPath,
              visible: false,
            }),
          ),
        },
      ],
    };
  }

  /**
   * Recursively collect all leaf series field paths from a set of structural descriptors.
   */
  #collectAllSeriesPaths({
    descriptors,
  }: {
    descriptors: ReadonlySet<BaseStructuralDescriptor>;
  }): ReadonlySet<SeriesPath> {
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

  /**
   * Derive per-stream data state via type guard narrowing.
   *
   * Cursor is available on all providers. projectionId and dataHash are indicator-specific — derived by narrowing the
   * provider via `isIndicatorProvider()` and finding the matching indicator by stream id.
   */
  #deriveDataState({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): PerStreamDataState {
    return dataProvider.getDataState({ dataStreamIdentifier });
  }

  #findDataStreamIdentifierForDefaultGroup({
    dataProvider,
    group,
  }: {
    dataProvider: DataProviderLike;
    group: SeriesGroupLayout;
  }): DataStreamIdentifier | undefined {
    if (group.dataStreamId !== undefined) {
      const matchingStreamById = dataProvider.dataStreamIdentifiers
        .values()
        .find(
          (dataStreamIdentifier) =>
            dataStreamIdentifier.id === group.dataStreamId,
        );

      if (matchingStreamById !== undefined) {
        return matchingStreamById;
      }
    }

    if (group.groupId !== undefined) {
      const matchingStreamByGroupId = dataProvider.dataStreamIdentifiers
        .values()
        .find((dataStreamIdentifier) => {
          return (
            this.#makeGroupId({ dataProvider, dataStreamIdentifier }) ===
            group.groupId
          );
        });

      if (matchingStreamByGroupId !== undefined) {
        return matchingStreamByGroupId;
      }
    }

    return dataProvider.dataStreamIdentifiers
      .values()
      .find(
        (dataStreamIdentifier) =>
          dataStreamIdentifier.type === group.streamType,
      );
  }

  /**
   * Find the live data stream identifier for a layout group.
   */
  #findDataStreamIdentifierForGroup({
    group,
  }: {
    group: SeriesGroupLayout;
  }): DataStreamIdentifier | undefined {
    if (group.dataStreamId !== undefined) {
      const streamById = this.dataProviderMap
        .keys()
        .find(
          (dataStreamIdentifier) =>
            dataStreamIdentifier.id === group.dataStreamId,
        );

      if (streamById !== undefined) {
        return streamById;
      }
    }

    for (const [dataStreamIdentifier, dataProvider] of this.dataProviderMap) {
      const groupId = this.#makeGroupId({ dataProvider, dataStreamIdentifier });

      if (group.groupId !== undefined && groupId === group.groupId) {
        return dataStreamIdentifier;
      }
    }

    return undefined;
  }

  #findStreamKeyForDataStreamIdentifier({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): string | undefined {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (
        streamId.type === dataStreamIdentifier.type &&
        streamId.id === dataStreamIdentifier.id
      ) {
        return this.#makeDataStreamKey({
          dataProvider,
          dataStreamIdentifier: streamId,
        });
      }
    }

    return undefined;
  }

  /**
   * Stream key: `${providerType}-${providerId}-${streamType}-${streamId}`
   */
  #makeDataStreamKey({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): string {
    return `${dataProvider.identifier.type}-${dataProvider.identifier.id}-${dataStreamIdentifier.type}-${dataStreamIdentifier.id}`;
  }

  #makeGroupId({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): GroupId {
    return dataProvider.groupIdFor({ dataStreamIdentifier });
  }

  /**
   * Create a data stream presenter via the registry. No caching — presenters are stateless and created inline inside
   *
   * @cached getters. When providers change, the @cached getter invalidates and new presenters are created.
   */
  #makePresenter({
    dataProvider,
    dataStreamIdentifier,
  }: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): DataStreamPresenterLike {
    return this.#dataStreamPresenterRegistry.makeDataStreamPresenter({
      dataProvider,
      dataStreamIdentifier,
    });
  }

  /**
   * Resolve a DataStreamIdentifier to its canonical group identity by walking dataProviderMap.
   *
   * Bound and passed to ChartLayout at construction so the layout can resolve identifiers without direct access to the
   * provider set.
   */
  #resolveGroupId({
    dataStreamIdentifier,
  }: {
    dataStreamIdentifier: DataStreamIdentifier;
  }): GroupId | undefined {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (
        streamId.type === dataStreamIdentifier.type &&
        streamId.id === dataStreamIdentifier.id
      ) {
        return this.#makeGroupId({
          dataProvider,
          dataStreamIdentifier: streamId,
        });
      }
    }

    return undefined;
  }

  /**
   * Resolve series detail (field paths + visibility) from a presenter's structural descriptors and defaultSeries.
   *
   * Collects all leaf series paths from the presenter's descriptor tree, then marks each as visible if it's in the
   * presenter's `defaultSeries` set. Used by `#assembleDefaultLayout()` to fill in the provider's empty series arrays.
   */
  #resolveSeriesFromPresenter({
    presenter,
  }: {
    presenter: DataStreamPresenterLike;
  }): ReadonlyArray<SeriesLayout> {
    const visiblePaths = presenter.defaultSeries;
    const allPaths = this.#collectAllSeriesPaths({
      descriptors: presenter.structuralDescriptors,
    });

    return allPaths
      .values()
      .map((fieldPath) => ({
        fieldPath,
        visible: visiblePaths.has(fieldPath),
      }))
      .toArray();
  }
}
