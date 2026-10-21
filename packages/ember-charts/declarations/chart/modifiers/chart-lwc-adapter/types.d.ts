/**
 * ChartLwcAdapter — Adapter State Types
 *
 * Internal state types for the chart LWC adapter (Layer 3). These represent the live LWC DOM state that the adapter
 * manages, mirroring the declarative ChartLayoutData structure with concrete API handles.
 *
 * The adapter maintains a Map<number, ChartPaneState> keyed by pane index (panes are identityless containers; identity
 * lives at the series group level via explicit GroupId carried by schema state).
 *
 * Change detection is handled by diffGroupStates (pure function) using GroupSnapshot for previous-cycle state and
 * GroupDiff for per-group change descriptions. The adapter only stores LWC DOM handles — no change detection fields.
 */
import type { AnchoredPanePrimitive } from '../../chart-ui/primitives/anchored-text';
import type { DataProviderCursor } from '../../data-providers/_lib/data-stream/types';
import type { GroupId, SeriesPath } from '../../schema/types';
import type { SeriesAdapterLike, SeriesApiLike } from '../../series-adapters/_lib/_adapter';
import type { IPaneApi, Time } from 'lightweight-charts';
/**
 * AdapterGroupState
 *
 * Live state for a series group within a pane. Contains only LWC DOM handles — the series API references and their
 * adapters. No change detection fields; those live in GroupSnapshot and are managed by diffGroupStates.
 */
export type AdapterGroupState = Readonly<{
    series: Map<SeriesPath, ChartSeriesState>;
}>;
/**
 * ChartDomainContext
 *
 * Domain-specific data that the adapter needs for labeling but that the schema no longer owns (Decision 18). Provided
 * by the component layer which has direct access to the domain models (MarketDataData, TradableAssetPair).
 */
export type ChartDomainContext = Readonly<{
    /**
     * Number of market data samples (candlesticks) — used for initial focus range calculation.
     */
    marketDataDataSampleCount: number;
    /**
     * Human-readable timeframe label (e.g., "1m", "5m") — used for pane label construction.
     */
    timeframeLabel: string;
    /**
     * Trading pair display name (e.g., "SOL/USDC") — used for pane label construction.
     */
    tradableAssetPairName: string;
}>;
/**
 * ChartPaneState
 *
 * Live state for a single chart pane. Holds the LWC pane API handle, an optional label primitive, and the series groups
 * rendered within this pane.
 */
export type ChartPaneState = Readonly<{
    labelPrimitive?: AnchoredPanePrimitive;
    paneApi: IPaneApi<Time>;
    seriesGroups: Map<GroupId, AdapterGroupState>;
}>;
/**
 * ChartSeriesState
 *
 * Live state for a single materialized series on the chart. Holds the LWC series API handle and the adapter that
 * translates between our internal data format and LWC's expected format.
 */
export type ChartSeriesState = Readonly<{
    adapter: SeriesAdapterLike;
    seriesApi: SeriesApiLike;
}>;
/**
 * GroupDiff
 *
 * Per-group change description produced by diffGroupStates. Reports what happened truthfully as independent dimensions
 * — the adapter decides which combinations are redundant.
 *
 * - `structural`: Group added or removed. Undefined when group exists in both previous and current.
 * - `dataChange`: Data-level change requiring LWC series operations. 'rebuilt' = tear down + recreate with full backfill
 *   (identity changed). 'updated' = fetch since last cursor, push to existing series (covers both new bars and
 *   latest-bar mutations). Undefined when no data change detected.
 * - `namesChanged`: Stream name or provider name changed. Independent of data/structural changes — the adapter skips this
 *   when structural or rebuilt already uses current names.
 */
export type GroupDiff = Readonly<{
    dataChange?: 'rebuilt' | 'updated';
    namesChanged: boolean;
    structural?: 'added' | 'removed';
}>;
/**
 * GroupSnapshot
 *
 * Snapshot of a group's diffable state, captured from SeriesGroupState after each reconciliation cycle. Used by
 * diffGroupStates to detect what changed between cycles. Contains everything needed for comparison — no fragmented
 * caches.
 */
export type GroupSnapshot = Readonly<{
    cursor: DataProviderCursor | undefined;
    dataHash: string | undefined;
    dataLength: number | undefined;
    dataStreamId: string;
    projectionId: string | undefined;
    providerName: string;
    streamName: string;
    visibleFieldPathsSignature: string;
}>;
//# sourceMappingURL=types.d.ts.map