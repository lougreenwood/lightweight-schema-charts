/**
 * ChartLwcAdapter Modifier
 *
 * Layer 3 of the reactive chart architecture. Owns all LWC DOM operations for the reactive chart schema. Reads
 * `schema.state` (enriched tree) reactively and reconciles LWC DOM state against it.
 *
 * Change detection is delegated to the pure `diffGroupStates` function which compares a Map<GroupId, GroupSnapshot>
 * (captured after each reconciliation) against the current enriched groups. The adapter only stores LWC DOM handles
 * (#paneStates) and previous snapshots (#previousSnapshots) — no parallel cached state.
 *
 * Reconciliation strategy (two-phase):
 *
 * Phase 1 — Structural:
 *
 * - Groups marked 'added' → find correct pane, create pane if needed, build series with full backfill
 * - Groups marked 'removed' → tear down series, remove from pane, remove pane if empty
 *
 * Phase 2 — Data (for existing groups):
 *
 * - DataChange: 'rebuilt' → tear down + recreate series with full backfill
 * - DataChange: 'updated' → fetch since previous cursor, updateSeries (LWC upsert-by-timestamp)
 * - NamesChanged (when no structural/rebuilt) → update labels via applyOptions
 *
 * Usage:
 *
 * ```hbs
 * <div {{chartLwcAdapter this.reactiveSchema this.seriesAdapterRegistry this.domainContext}}></div>
 * ```
 */

import type { AnchoredPanePrimitive } from '../chart-ui/primitives/anchored-text';
import type { DataProviderLike } from '../data-providers/_lib/data-provider-like';
import type { DataProviderUnknownStreamError } from '../data-providers/errors';
import type {
  BaseChartDataSample,
  DataProviderCursor,
  DataStreamIdentifier,
} from '../data-providers/_lib/data-stream/types';
import type { DataStreamPresenterLike } from '../data-stream-presenters/_lib/data-stream-presenter-like';
import type {
  AdapterGroupState,
  ChartDomainContext,
  ChartPaneState,
  ChartSeriesState,
  GroupSnapshot,
} from './chart-lwc-adapter/types';
import type {
  ChartState,
  GroupId,
  PaneState,
  SeriesGroupState,
  SeriesPath,
} from '../schema/types';
import type { SeriesAdapterRegistry } from '../series-adapters/_lib/_registry';
import type { BaseSeriesOptions } from '../series-adapters/_lib/_adapter';
import { interpretProjectedPoints } from '../series-adapters/_lib/value-handler';
import type {
  SeriesValueFailure,
  SeriesValueHandler,
} from '../series-adapters/_lib/value-handler/types';
import type { ProjectedSeriesPoint } from '../data-stream-presenters/_lib/abstract-data-stream-presenter/types';
import type { SeriesAdapterInternalPoint } from '../series-adapters/_lib/_adapter';
import type { SeriesType } from '../series-adapters/_lib/_registry/types';
import type {
  SeriesValueNumberValidationError,
  SeriesValueOhlcConverterMissingError,
  SeriesValueOhlcValidationError,
  SeriesValuePointsEmptyError,
} from '../series-adapters/_lib/value-handler/errors';
import type { Result } from 'true-myth/result';
import { err, ok } from 'true-myth/result';
import type { IChartApi, Time } from 'lightweight-charts';

import { createPaneLabelPrimitive } from '../chart-ui/primitives/anchored-text';
import {
  captureGroupSnapshot,
  diffGroupStates,
  flattenStateToGroupMap,
} from './chart-lwc-adapter/diff-group-states';
import {
  findDescriptorWithParent,
  isCompleteLeafStructuralDescriptor,
} from '../schema/utils';
import { getChartTheme } from '../theme/chart-theme';
import { buildPaneLabel, buildSeriesTitle } from '../utils/labels';
import pinoLogger from '../../vendor/utils-base/logger/pino-logger';
import { createScheduleWorkHelper } from '../../vendor/utils-base/schedule-after-render';
import Modifier from 'ember-modifier';
import { createChart, TickMarkType } from 'lightweight-charts';

interface ChartLwcAdapterModifierSignature {
  Args: {
    Named: {
      onError?: (failure: SeriesValueFailure) => void;
      /**
       * Optional callback invoked once after the LWC chart instance is created. Receives an `applyTheme` function that
       * re-reads the current chart theme and re-applies it. Used by CanvasThemeModifier to react to OS/user theme
       * changes without coupling theme observation into this adapter.
       */
      onReady?: (args: { applyTheme: () => void; chart: IChartApi }) => void;
    };
    Positional: [
      state: ChartState,
      seriesAdapterRegistry: SeriesAdapterRegistry,
      domainContext: ChartDomainContext,
    ];
  };
  Element: HTMLElement;
}

export default class ChartLwcAdapterModifier extends Modifier<ChartLwcAdapterModifierSignature> {
  /**
   * Re-reads the current chart theme and applies it to the LWC chart instance. Called by CanvasThemeModifier when the
   * document theme class changes.
   */
  applyTheme = (): void => {
    if (!this.#chart) return;
    this.#chart.applyOptions(getChartTheme());
  };

  override modify(
    element: HTMLElement,
    [state, seriesAdapterRegistry, domainContext]: [
      ChartState,
      SeriesAdapterRegistry,
      ChartDomainContext,
    ],
    {
      onReady,
      onError,
    }: {
      onReady?: (args: { applyTheme: () => void; chart: IChartApi }) => void;
      onError?: (failure: SeriesValueFailure) => void;
    },
  ): void {
    this.#onError = onError;
    // Schedule LWC DOM mutations after render
    this.#scheduleWork(() => {
      // Create chart on first call
      if (!this.#chart) {
        this.#chart = createChart(element, {
          ...getChartTheme(),
          addDefaultPane: false,
          autoSize: true,
          leftPriceScale: { visible: false },
          timeScale: {
            secondsVisible: false,
            tickMarkFormatter: this.#tickMarkFormatter,
            timeVisible: true,
          },
        });

        onReady?.({ applyTheme: this.applyTheme, chart: this.#chart });
      }

      this.#reconcile({
        chart: this.#chart,
        domainContext,
        seriesAdapterRegistry,
        state,
      });

      // Apply focus range once after first data load
      if (!this.#hasAppliedInitialFocusRange && this.#paneStates.size > 0) {
        this.#applyInitialFocusRange({ chart: this.#chart, domainContext });
        this.#hasAppliedInitialFocusRange = true;
      }
    });
  }

  /**
   * The LWC chart instance, created on first modify() call.
   */
  #chart: IChartApi | undefined;
  #onError: ((failure: SeriesValueFailure) => void) | undefined;

  /**
   * Whether the initial focus range has been applied after the first data load.
   */
  #hasAppliedInitialFocusRange = false;

  /**
   * Adapter state: maps pane index to live LWC pane state.
   */
  readonly #paneStates: Map<number, ChartPaneState> = new Map();

  /**
   * Previous-cycle domain context for detecting global label changes (timeframe, trading pair name). When these change,
   * all pane labels need refreshing regardless of per-group diff results.
   */
  #previousDomainContext: ChartDomainContext | undefined;

  /**
   * Previous-cycle snapshots for change detection. Captured after each reconciliation pass and fed to diffGroupStates
   * on the next cycle.
   */
  readonly #previousSnapshots: Map<GroupId, GroupSnapshot> = new Map();

  /**
   * Groups whose value interpretation failed. They keep no partial series and are retried on the next reconciliation
   * cycle, so a transient handler failure cannot leave a plausible but incomplete chart.
   */
  readonly #needsBackfill: Set<GroupId> = new Set();

  /**
   * Lifecycle-aware scheduler that cancels pending work on destruction.
   */
  readonly #scheduleWork = createScheduleWorkHelper(this);

  /**
   * Add a new group: find or create the correct pane from the enriched state, then build series with full backfill.
   */
  #addGroup({
    chart,
    domainContext,
    enrichedGroup,
    groupId,
    seriesAdapterRegistry,
    state,
  }: {
    chart: IChartApi;
    domainContext: ChartDomainContext;
    enrichedGroup: SeriesGroupState;
    groupId: GroupId;
    seriesAdapterRegistry: SeriesAdapterRegistry;
    state: ChartState;
  }): void {
    // Find which pane index this group belongs to in the enriched state
    const targetPaneInfo = this.#findPaneForGroup({ groupId, state });
    if (!targetPaneInfo) return;

    const {
      isFirstGroupInPane,
      paneIndex,
      paneState: enrichedPane,
    } = targetPaneInfo;

    // Get or create the pane
    let chartPane = this.#paneStates.get(paneIndex);

    if (!chartPane) {
      // Orphan pane reuse: after teardown, LWC keeps 1 orphan pane. Reuse it for the first pane.
      const chartPanes = chart.panes();
      const isFirstPaneAndOrphanExists =
        this.#paneStates.size === 0 && chartPanes.length > 0;
      const paneApi = isFirstPaneAndOrphanExists
        ? chartPanes[0]!
        : chart.addPane(true);
      const actualPaneIndex = paneApi.paneIndex();

      // Build pane label
      const labelPrimitive = this.#buildPaneLabel({
        domainContext,
        isFirstPane: actualPaneIndex === 0,
        paneState: enrichedPane,
      });

      if (labelPrimitive) {
        paneApi.attachPrimitive(labelPrimitive);
      }

      chartPane = {
        labelPrimitive,
        paneApi,
        seriesGroups: new Map(),
      };
      this.#paneStates.set(actualPaneIndex, chartPane);
    }

    // Build the series group
    const groupResult = this.#buildSeriesGroup({
      chart,
      enrichedGroup,
      paneIndex: chartPane.paneApi.paneIndex(),
      seriesAdapterRegistry,
    });

    // Always register the group — empty placeholder when data is not yet available, so the group
    // remains addressable for rebuild on subsequent cycles.
    chartPane.seriesGroups.set(groupId, groupResult ?? { series: new Map() });

    // Update pane label if this is the first group
    if (isFirstGroupInPane && chartPane.labelPrimitive) {
      this.#refreshPaneLabel({
        chartPane,
        domainContext,
        enrichedPane,
        paneIndex: chartPane.paneApi.paneIndex(),
      });
    }
  }

  /**
   * Focus the chart time scale on the latest ~400 data points after first data load.
   */
  #applyInitialFocusRange({
    chart,
    domainContext,
  }: {
    chart: IChartApi;
    domainContext: ChartDomainContext;
  }): void {
    const count = domainContext.marketDataDataSampleCount;

    if (count === 0) return;

    const maxRange = Math.max(0, count - 1);

    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, maxRange - 400),
      to: maxRange,
    });
  }

  /**
   * Build the pane label primitive from the first series group's resolved presenter and provider.
   */
  #buildPaneLabel({
    domainContext,
    isFirstPane,
    paneState,
  }: {
    domainContext: ChartDomainContext;
    isFirstPane: boolean;
    paneState: PaneState;
  }): AnchoredPanePrimitive | undefined {
    const firstGroup = paneState.seriesGroups[0];
    if (!firstGroup) return undefined;

    // Find first visible series field path
    const firstVisibleSeries = firstGroup.series.find((s) => s.visible);
    if (!firstVisibleSeries) return undefined;

    const { presenter, provider } = firstGroup;

    // Find descriptor for first visible field
    const descriptorWithParent = findDescriptorWithParent({
      descriptors: presenter.structuralDescriptors,
      fieldPath: firstVisibleSeries.fieldPath,
    });

    if (!descriptorWithParent) {
      // Fallback: minimal label
      const fallbackLabel = isFirstPane
        ? `${domainContext.tradableAssetPairName} | ${provider.name} - ${firstGroup.streamType} [${domainContext.timeframeLabel}]`
        : `${provider.name} - ${firstGroup.streamType} [${domainContext.timeframeLabel}]`;
      return createPaneLabelPrimitive(fallbackLabel);
    }

    const labelText = buildPaneLabel({
      fieldDescriptor: descriptorWithParent.descriptor,
      isFirstPane,
      parentDescriptor: descriptorWithParent.parent,
      providerName: provider.name,
      streamType: presenter.streamName,
      timeframeLabel: domainContext.timeframeLabel,
      tradableAssetPairName: domainContext.tradableAssetPairName,
    });

    return createPaneLabelPrimitive(labelText);
  }

  /**
   * Build a single series group from the enriched tree: fetch data, create series for each visible field.
   *
   * Returns the adapter group state (LWC DOM handles only), or undefined if no series could be created.
   */
  #buildSeriesGroup({
    chart,
    enrichedGroup,
    paneIndex,
    seriesAdapterRegistry,
  }: {
    chart: IChartApi;
    enrichedGroup: SeriesGroupState;
    paneIndex: number;
    seriesAdapterRegistry: SeriesAdapterRegistry;
  }): AdapterGroupState | undefined {
    const { dataStreamIdentifier, groupId, presenter, provider } =
      enrichedGroup;

    // Fetch data (full backfill — no cursor)
    const dataSamples = this.#fetchSamples({
      dataStreamIdentifier,
      provider,
    }).match({
      Err: (error) => {
        pinoLogger.error(
          { error },
          '[ChartLwcAdapter] failed to fetch samples for a new group',
        );
        this.#needsBackfill.add(groupId);
        return undefined;
      },
      Ok: (samples) => samples,
    });

    if (dataSamples === undefined) {
      return undefined;
    }

    // Create series for each visible field
    const seriesMap = new Map<SeriesPath, ChartSeriesState>();
    let failed = false;

    for (const seriesLayout of enrichedGroup.series) {
      if (!seriesLayout.visible) continue;

      const seriesState = this.#createSeries({
        chart,
        dataSamples,
        fieldPath: seriesLayout.fieldPath,
        groupId,
        paneIndex,
        presenter,
        priceScaleId: enrichedGroup.priceScale?.id,
        seriesAdapterRegistry,
      });

      if (seriesState) {
        seriesMap.set(seriesLayout.fieldPath, seriesState);
      } else {
        failed = true;
      }
    }

    if (failed || seriesMap.size === 0) {
      for (const seriesState of seriesMap.values()) {
        this.#removeSeries({ chart, seriesApi: seriesState.seriesApi });
      }
      this.#needsBackfill.add(groupId);
      return undefined;
    }

    this.#needsBackfill.delete(groupId);

    // Apply scaleMargins to the price scale via any series in this group (all share the same priceScaleId)
    if (enrichedGroup.priceScale?.scaleMargins) {
      const firstSeries = seriesMap.values().next().value;
      if (firstSeries) {
        firstSeries.seriesApi.priceScale().applyOptions({
          scaleMargins: enrichedGroup.priceScale.scaleMargins,
        });
      }
    }

    return {
      series: seriesMap,
    };
  }

  /**
   * Create a single series on the chart: resolve descriptor, get adapter, create series, backfill.
   */
  #createSeries({
    chart,
    dataSamples,
    fieldPath,
    groupId,
    paneIndex,
    presenter,
    priceScaleId,
    seriesAdapterRegistry,
  }: {
    chart: IChartApi;
    dataSamples: ReadonlySet<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >;
    fieldPath: SeriesPath;
    groupId: GroupId;
    paneIndex: number;
    presenter: DataStreamPresenterLike<DataProviderLike, DataStreamIdentifier>;
    priceScaleId?: string;
    seriesAdapterRegistry: SeriesAdapterRegistry;
  }): ChartSeriesState | undefined {
    // Find descriptor for this field
    const descriptorWithParent = findDescriptorWithParent({
      descriptors: presenter.structuralDescriptors,
      fieldPath,
    });

    if (!descriptorWithParent) {
      pinoLogger.warn(
        { fieldPath },
        '[ChartLwcAdapter] descriptor not found for field',
      );
      return undefined;
    }

    const { descriptor, parent: parentDescriptor } = descriptorWithParent;

    if (!isCompleteLeafStructuralDescriptor(descriptor)) {
      pinoLogger.warn(
        { fieldPath },
        '[ChartLwcAdapter] descriptor is not a complete leaf',
      );
      return undefined;
    }

    // Get adapter for this series kind
    const adapterResult = seriesAdapterRegistry.getAdapterByType(
      descriptor.seriesKind,
    );

    return adapterResult.match({
      Err: (error) => {
        pinoLogger.error(
          { error, seriesKind: descriptor.seriesKind },
          '[ChartLwcAdapter] no adapter for series kind',
        );
        return undefined;
      },
      Ok: (adapter) => {
        const seriesTitle = buildSeriesTitle({
          fieldDescriptor: descriptor,
          parentDescriptor,
        });
        const seriesKey = `${groupId}::${fieldPath}`;
        return seriesAdapterRegistry
          .getValueHandler({ id: descriptor.valueHandler })
          .match({
            Err: (error) => {
              this.#reportValueFailure({ error, fieldPath, groupId });
              return undefined;
            },
            Ok: (valueHandler) => {
              const interpreted =
                dataSamples.size === 0
                  ? ok(new Set<SeriesAdapterInternalPoint>())
                  : this.#interpretSeriesData({
                      points: presenter.projectField({
                        dataSamples,
                        fieldPath,
                      }),
                      handler: valueHandler,
                      seriesKind: descriptor.seriesKind,
                    });

              return interpreted.match({
                Err: (error) => {
                  this.#reportValueFailure({ error, fieldPath, groupId });
                  return undefined;
                },
                Ok: (data) => {
                  const seriesOptions: BaseSeriesOptions = {
                    name: seriesTitle,
                  };
                  if (priceScaleId !== undefined)
                    seriesOptions.priceScaleId = priceScaleId;
                  if (valueHandler.priceFormat !== undefined)
                    seriesOptions.priceFormat = valueHandler.priceFormat;

                  const { seriesApi } = adapter.createSeries({
                    context: { chart, paneIndex, seriesKey },
                    options: seriesOptions,
                  });

                  if (data.size > 0) {
                    adapter.backfillSeries({ data, seriesApi });
                  }
                  return { adapter, seriesApi };
                },
              });
            },
          });
      },
    });
  }

  /**
   * Fetch data samples from a provider for a given stream.
   *
   * When cursor is provided, fetches data since that cursor (incremental). When cursor is undefined, fetches all data
   * (full backfill).
   */
  #fetchSamples({
    cursor,
    dataStreamIdentifier,
    provider,
  }: {
    cursor?: DataProviderCursor;
    dataStreamIdentifier: DataStreamIdentifier;
    provider: DataProviderLike;
  }): Result<
    ReadonlySet<BaseChartDataSample<object, object, DataStreamIdentifier>>,
    DataProviderUnknownStreamError
  > {
    const dataResult = provider.getDataSince({
      cursor,
      dataStreamIdentifier,
    });

    return dataResult.match({
      Err: (error) => {
        if (error.errorCode === 'DATA_PROVIDER_NO_NEW_DATA') {
          return ok(
            new Set<
              BaseChartDataSample<object, object, DataStreamIdentifier>
            >(),
          );
        }
        return err(error);
      },
      Ok: (batch) => {
        const samples = batch.updates
          .values()
          .reduce(
            (accumulated, update) => accumulated.add(update.data),
            new Set<
              BaseChartDataSample<object, object, DataStreamIdentifier>
            >(),
          );
        return ok(samples);
      },
    });
  }

  /**
   * Find the AdapterGroupState for a group by searching all panes.
   */
  #findAdapterGroupState({
    groupId,
  }: {
    groupId: GroupId;
  }): AdapterGroupState | undefined {
    for (const [, paneState] of this.#paneStates) {
      const group = paneState.seriesGroups.get(groupId);
      if (group) return group;
    }
    return undefined;
  }

  /**
   * Find the pane index and enriched pane for a given group ID from the enriched state tree.
   */
  #findPaneForGroup({
    groupId,
    state,
  }: {
    groupId: GroupId;
    state: ChartState;
  }):
    | undefined
    | { isFirstGroupInPane: boolean; paneIndex: number; paneState: PaneState } {
    for (let paneIdx = 0; paneIdx < state.panes.length; paneIdx++) {
      const pane = state.panes[paneIdx];
      if (!pane) continue;

      for (let groupIdx = 0; groupIdx < pane.seriesGroups.length; groupIdx++) {
        const group = pane.seriesGroups[groupIdx];
        if (!group) continue;

        const candidateGroupId: GroupId = group.groupId;
        if (candidateGroupId === groupId) {
          return {
            isFirstGroupInPane: groupIdx === 0,
            paneIndex: paneIdx,
            paneState: pane,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Tear down a group's series and recreate with full backfill. Used when dataChange is 'rebuilt' (identity changed:
   * dataStreamId, cursor regression, projectionId).
   *
   * Finds the pane containing this group and replaces its series in-place.
   */
  #rebuildGroupData({
    chart,
    enrichedGroup,
    groupId,
    seriesAdapterRegistry,
  }: {
    chart: IChartApi;
    enrichedGroup: SeriesGroupState;
    groupId: GroupId;
    seriesAdapterRegistry: SeriesAdapterRegistry;
  }): void {
    // Find the pane containing this group
    for (const [paneIndex, paneState] of this.#paneStates) {
      const existingGroup = paneState.seriesGroups.get(groupId);
      if (!existingGroup) continue;

      // Build the replacement first, then remove the old series only on success. A failed interpretation must not
      // discard previously rendered history.
      const newGroupState = this.#buildSeriesGroup({
        chart,
        enrichedGroup,
        paneIndex,
        seriesAdapterRegistry,
      });

      if (newGroupState === undefined) {
        break;
      }

      for (const [, seriesState] of existingGroup.series) {
        this.#removeSeries({ chart, seriesApi: seriesState.seriesApi });
      }

      paneState.seriesGroups.set(groupId, newGroupState);

      break;
    }
  }

  /**
   * Two-phase reconciliation driven by diffGroupStates.
   *
   * Phase 1 — Structural: process added/removed groups (create/tear down panes and series). Phase 2 — Data: process
   * data changes and name changes for existing groups.
   *
   * After both phases, capture fresh snapshots for the next cycle.
   */
  #reconcile({
    chart,
    domainContext,
    seriesAdapterRegistry,
    state,
  }: {
    chart: IChartApi;
    domainContext: ChartDomainContext;
    seriesAdapterRegistry: SeriesAdapterRegistry;
    state: ChartState;
  }): void {
    const currentGroups = flattenStateToGroupMap({ panes: state.panes });
    const diffs = diffGroupStates({
      currentGroups,
      previousSnapshots: this.#previousSnapshots,
    });

    // Retry groups whose previous value interpretation failed. Groups that are structurally added below are skipped;
    // this loop handles a failed earlier add or rebuild without duplicating Phase 1.
    const retriedGroups = new Set<GroupId>();
    for (const groupId of this.#needsBackfill.values().toArray()) {
      if (diffs.get(groupId)?.structural === 'added') continue;
      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) {
        this.#needsBackfill.delete(groupId);
        continue;
      }

      const hasPane = this.#paneStates
        .values()
        .some((paneState) => paneState.seriesGroups.has(groupId));

      if (hasPane) {
        this.#rebuildGroupData({
          chart,
          enrichedGroup,
          groupId,
          seriesAdapterRegistry,
        });
      } else {
        this.#addGroup({
          chart,
          domainContext,
          enrichedGroup,
          groupId,
          seriesAdapterRegistry,
          state,
        });
      }
      retriedGroups.add(groupId);
    }

    // Phase 1 — Structural: removals first (avoids index confusion), then additions
    for (const [groupId, diff] of diffs) {
      if (diff.structural !== 'removed') continue;

      this.#tearDownGroup({ chart, groupId });
    }

    for (const [groupId, diff] of diffs) {
      if (diff.structural !== 'added') continue;

      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) continue;

      this.#addGroup({
        chart,
        domainContext,
        enrichedGroup,
        groupId,
        seriesAdapterRegistry,
        state,
      });
    }

    // Detect global domain context changes (timeframe label, trading pair name).
    // These affect all pane labels but are not per-group concerns, so they're tracked here
    // rather than in diffGroupStates.
    const domainContextChanged =
      this.#previousDomainContext !== undefined &&
      (this.#previousDomainContext.timeframeLabel !==
        domainContext.timeframeLabel ||
        this.#previousDomainContext.tradableAssetPairName !==
          domainContext.tradableAssetPairName);

    // Phase 2 — Data: process changes for groups that exist in both previous and current
    for (const [groupId, diff] of diffs) {
      if (diff.structural) continue; // Already handled in Phase 1
      if (retriedGroups.has(groupId)) continue;

      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) continue;

      switch (diff.dataChange) {
        case 'rebuilt': {
          this.#rebuildGroupData({
            chart,
            enrichedGroup,
            groupId,
            seriesAdapterRegistry,
          });
          break;
        }
        case 'updated': {
          const previousSnapshot = this.#previousSnapshots.get(groupId);

          this.#updateGroupData({
            enrichedGroup,
            groupId,
            previousCursor: previousSnapshot?.cursor,
            seriesAdapterRegistry,
          });
          break;
        }
      }

      if (diff.namesChanged || domainContextChanged) {
        this.#updateGroupNames({
          domainContext,
          enrichedGroup,
          groupId,
          state,
        });
      }
    }

    // Capture snapshots for next cycle
    this.#previousSnapshots.clear();
    for (const [groupId, group] of currentGroups) {
      this.#previousSnapshots.set(groupId, captureGroupSnapshot({ group }));
    }
    this.#previousDomainContext = domainContext;
  }

  /**
   * Refresh a pane's label text from the first group's enriched state.
   */
  #refreshPaneLabel({
    chartPane,
    domainContext,
    enrichedPane,
    paneIndex,
  }: {
    chartPane: ChartPaneState;
    domainContext: ChartDomainContext;
    enrichedPane: PaneState;
    paneIndex: number;
  }): void {
    if (!chartPane.labelPrimitive) return;

    const firstGroup = enrichedPane.seriesGroups[0];
    if (!firstGroup) return;

    const firstVisibleSeries = firstGroup.series.find((s) => s.visible);
    if (!firstVisibleSeries) return;

    const descriptorWithParent = findDescriptorWithParent({
      descriptors: firstGroup.presenter.structuralDescriptors,
      fieldPath: firstVisibleSeries.fieldPath,
    });

    if (descriptorWithParent) {
      const newLabelText = buildPaneLabel({
        fieldDescriptor: descriptorWithParent.descriptor,
        isFirstPane: paneIndex === 0,
        parentDescriptor: descriptorWithParent.parent,
        providerName: firstGroup.provider.name,
        streamType: firstGroup.presenter.streamName,
        timeframeLabel: domainContext.timeframeLabel,
        tradableAssetPairName: domainContext.tradableAssetPairName,
      });

      chartPane.labelPrimitive.applyOptions({ text: newLabelText });
    }
  }

  /**
   * Remove a series from the chart. Clears the crosshair position first to work around an LWC bug
   * (https://github.com/tradingview/lightweight-charts/issues/2044) where series data mutations trigger a synchronous
   * crosshair hit-test against bar indices that no longer have data.
   */
  #removeSeries({
    chart,
    seriesApi,
  }: {
    chart: IChartApi;
    seriesApi: ChartSeriesState['seriesApi'];
  }): void {
    chart.clearCrosshairPosition();
    chart.removeSeries(seriesApi);
  }

  /**
   * Tear down all series for a removed group. If the pane becomes empty, remove the pane.
   */
  #tearDownGroup({
    chart,
    groupId,
  }: {
    chart: IChartApi;
    groupId: GroupId;
  }): void {
    for (const [paneIndex, paneState] of this.#paneStates) {
      const existingGroup = paneState.seriesGroups.get(groupId);
      if (!existingGroup) continue;

      // Remove all series from this group
      for (const [, seriesState] of existingGroup.series) {
        this.#removeSeries({ chart, seriesApi: seriesState.seriesApi });
      }

      paneState.seriesGroups.delete(groupId);

      // If pane is now empty, tear it down
      if (paneState.seriesGroups.size === 0) {
        if (paneState.labelPrimitive) {
          paneState.paneApi.detachPrimitive(paneState.labelPrimitive);
        }
        // LWC silently ignores removing the last pane
        chart.removePane(paneState.paneApi.paneIndex());
        this.#paneStates.delete(paneIndex);
      }

      break;
    }
  }

  /**
   * Format tick marks on the time scale based on the tick mark type.
   */
  #tickMarkFormatter = (time: Time, tickMarkType: TickMarkType): string => {
    const date = new Date((time as number) * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    if (tickMarkType === TickMarkType.Year)
      return `${month}/${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.Month)
      return `${month}/${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.DayOfMonth)
      return `${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.Time) return `${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.TimeWithSeconds)
      return `${hours}:${minutes}`;

    return `${hours}:${minutes}`;
  };

  /**
   * Incremental data update for a group: fetch data since previous cursor and call updateSeries per visible series.
   *
   * Uses `getDataSince({ cursor: previousCursor })` which returns data at or after the cursor timestamp. LWC's
   * `seriesApi.update()` is upsert-by-timestamp, so both new appends and latest-bar overwrites are handled correctly.
   */
  #updateGroupData({
    enrichedGroup,
    groupId,
    previousCursor,
    seriesAdapterRegistry,
  }: {
    enrichedGroup: SeriesGroupState;
    groupId: GroupId;
    previousCursor: DataProviderCursor | undefined;
    seriesAdapterRegistry: SeriesAdapterRegistry;
  }): void {
    const { dataStreamIdentifier, presenter, provider } = enrichedGroup;

    // Fetch data since previous cursor
    const dataSamples = this.#fetchSamples({
      cursor: previousCursor,
      dataStreamIdentifier,
      provider,
    }).match({
      Err: (error) => {
        pinoLogger.error(
          { error },
          '[ChartLwcAdapter] failed to fetch samples for an update',
        );
        this.#needsBackfill.add(groupId);
        return undefined;
      },
      Ok: (samples) => samples,
    });

    if (dataSamples === undefined || dataSamples.size === 0) return;

    // Find the adapter group state for this group
    const adapterGroupState = this.#findAdapterGroupState({ groupId });
    if (!adapterGroupState) return;

    // Update each visible series
    for (const seriesState of enrichedGroup.series) {
      if (!seriesState.visible) continue;

      const cachedSeries = adapterGroupState.series.get(seriesState.fieldPath);
      if (!cachedSeries) continue;

      const found = findDescriptorWithParent({
        descriptors: presenter.structuralDescriptors,
        fieldPath: seriesState.fieldPath,
      });
      if (
        found === undefined ||
        !isCompleteLeafStructuralDescriptor(found.descriptor)
      )
        continue;
      const fieldDescriptor = found.descriptor;
      const handlerResult = seriesAdapterRegistry.getValueHandler({
        id: fieldDescriptor.valueHandler,
      });
      handlerResult.match({
        Err: (error) => {
          this.#reportValueFailure({
            error,
            fieldPath: seriesState.fieldPath,
            groupId,
          });
          this.#needsBackfill.add(groupId);
        },
        Ok: (handler) =>
          this.#interpretSeriesData({
            points: presenter.projectField({
              dataSamples,
              fieldPath: seriesState.fieldPath,
            }),
            handler,
            seriesKind: fieldDescriptor.seriesKind,
          }).match({
            Err: (error) => {
              this.#reportValueFailure({
                error,
                fieldPath: seriesState.fieldPath,
                groupId,
              });
              this.#needsBackfill.add(groupId);
            },
            Ok: (projectedData) => {
              const incrementalProjectedData =
                previousCursor === undefined
                  ? projectedData
                  : new Set(
                      projectedData
                        .values()
                        .filter(
                          (point) =>
                            point.time.getTime() >= previousCursor.time,
                        ),
                    );
              if (incrementalProjectedData.size > 0) {
                cachedSeries.adapter.updateSeries({
                  data: incrementalProjectedData,
                  seriesApi: cachedSeries.seriesApi,
                });
              }
            },
          }),
      });
    }
  }

  #interpretSeriesData({
    points,
    handler,
    seriesKind,
  }: {
    points: ReadonlySet<ProjectedSeriesPoint>;
    handler: SeriesValueHandler;
    seriesKind: SeriesType;
  }): Result<
    ReadonlySet<SeriesAdapterInternalPoint>,
    | SeriesValueNumberValidationError
    | SeriesValueOhlcValidationError
    | SeriesValueOhlcConverterMissingError
    | SeriesValuePointsEmptyError
  > {
    return interpretProjectedPoints({ points, handler, seriesKind });
  }

  #reportValueFailure({ error, fieldPath, groupId }: SeriesValueFailure): void {
    pinoLogger.error(
      { error, fieldPath, groupId },
      '[ChartLwcAdapter] series value interpretation failed',
    );
    this.#onError?.({ error, fieldPath, groupId });
  }

  /**
   * Update pane label and series titles when a group's stream name or provider name changes. Operates in-place via
   * `applyOptions` — no teardown or structural rebuild.
   */
  #updateGroupNames({
    domainContext,
    enrichedGroup,
    groupId,
    state,
  }: {
    domainContext: ChartDomainContext;
    enrichedGroup: SeriesGroupState;
    groupId: GroupId;
    state: ChartState;
  }): void {
    const adapterGroupState = this.#findAdapterGroupState({ groupId });
    if (!adapterGroupState) return;

    // Update series titles for each visible series in this group
    for (const seriesState of enrichedGroup.series) {
      if (!seriesState.visible) continue;

      const cachedSeries = adapterGroupState.series.get(seriesState.fieldPath);
      if (!cachedSeries) continue;

      const descriptorWithParent = findDescriptorWithParent({
        descriptors: enrichedGroup.presenter.structuralDescriptors,
        fieldPath: seriesState.fieldPath,
      });

      if (!descriptorWithParent) continue;

      const newSeriesTitle = buildSeriesTitle({
        fieldDescriptor: descriptorWithParent.descriptor,
        parentDescriptor: descriptorWithParent.parent,
      });

      cachedSeries.adapter.applyOptions({
        options: { name: newSeriesTitle },
        seriesApi: cachedSeries.seriesApi,
      });
    }

    // Update pane label if this is the first group in its pane
    const paneInfo = this.#findPaneForGroup({ groupId, state });
    if (!paneInfo || !paneInfo.isFirstGroupInPane) return;

    const chartPane = this.#paneStates.get(paneInfo.paneIndex);
    if (!chartPane) {
      // Pane indices may differ between enriched state and adapter — search by group membership
      for (const [, pane] of this.#paneStates) {
        if (!pane.seriesGroups.has(groupId)) continue;

        if (pane.labelPrimitive) {
          this.#refreshPaneLabel({
            chartPane: pane,
            domainContext,
            enrichedPane: paneInfo.paneState,
            paneIndex: pane.paneApi.paneIndex(),
          });
        }
        break;
      }
      return;
    }

    if (chartPane.labelPrimitive) {
      this.#refreshPaneLabel({
        chartPane,
        domainContext,
        enrichedPane: paneInfo.paneState,
        paneIndex: paneInfo.paneIndex,
      });
    }
  }
}
