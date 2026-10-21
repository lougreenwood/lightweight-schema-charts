import type { AnchoredPanePrimitive } from '../chart-ui/primitives/anchored-text';
import type { DataProviderLike } from '../data-providers/_lib/data-provider-like';
import type { DataProviderCursor, DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { DataStreamPresenterLike } from '../data-stream-presenters/_lib/data-stream-presenter-like';
import type { SeriesAdapterLike, SeriesApiLike } from '../series-adapters/_lib/_adapter';
import type { IPaneApi, Time } from 'lightweight-charts';
/**
 * BaseStructuralDescriptor
 *
 * Union of all field descriptor types. Forms a tree structure describing the available fields for a data stream.
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
export type BaseStructuralDescriptor<TDataStreamId extends DataStreamIdentifier> = BranchStructuralDescriptor<TDataStreamId> | LeafStructuralDescriptor<TDataStreamId>;
/**
 * ProjectedData
 *
 * Union of all chart data point types that can be projected from samples. Each type corresponds to a specific
 * LightweightCharts series type.
 */
/**
 * BranchStructuralDescriptor
 *
 * Describes a container field that groups related series fields. Used for organizing complex data structures in the UI.
 *
 * Examples:
 *
 * - Volume with buy/sell/total children
 * - MACD with macd/signal/histogram children
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
export type BranchStructuralDescriptor<TDataStreamId extends DataStreamIdentifier> = BaseFieldDescriptor<TDataStreamId> & Readonly<{
    children: ReadonlySet<BaseStructuralDescriptor<TDataStreamId>>;
    kind: 'structural';
    structuralGroupType: StructuralGroupType;
}>;
/**
 * ChartLayoutData
 *
 * Top-level layout tree describing the full chart structure. Assembled from presenter fragments (Level 2) and mutated
 * by user actions (Level 3). Group identity is carried explicitly per series group.
 */
export type ChartLayoutData = Readonly<{
    panes: ReadonlyArray<PaneLayout>;
}>;
/**
 * ChartLayoutFragmentData
 *
 * A presenter's contribution to the chart layout (Level 1). Structurally identical to a partial ChartLayoutData but
 * semantically represents a single presenter's default layout before assembly.
 */
export type ChartLayoutFragmentData = Readonly<{
    panes: ReadonlyArray<PaneLayout>;
}>;
/**
 * Portable visibility override for a single series field.
 *
 * This is the serializable shape of the existing ChartLayout overlay entry, suitable for container-owned persistence.
 */
export type ChartLayoutOverlayEntry = Readonly<{
    fieldPath: SeriesPath;
    groupId: GroupId;
    visible: boolean;
}>;
/**
 * Serializable snapshot of the current ChartLayout visibility overlay.
 */
export type ChartLayoutOverlaySnapshot = ReadonlyArray<ChartLayoutOverlayEntry>;
/**
 * ChartState
 *
 * Top-level enriched tree produced by `ReactiveChartSchema.state`. Crosses the layout overlay with the live provider
 * inventory to produce a fully-resolved, read-only snapshot for the chart adapter (Layer 3).
 *
 * Identity comes from explicit per-group IDs carried through the enriched state.
 */
export type ChartState = Readonly<{
    panes: ReadonlyArray<PaneState>;
}>;
/**
 * CompleteLeafStructuralDescriptor
 *
 * Series field descriptor with explicit seriesKind. Returned by known presenters that understand their data structure.
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
export type CompleteLeafStructuralDescriptor<TDataStreamId extends DataStreamIdentifier> = BaseFieldDescriptor<TDataStreamId> & Readonly<{
    kind: 'series';
    seriesKind: SeriesType;
    valueHandler?: string;
}>;
/**
 * DefaultVisibleFields
 *
 * Configuration for controlling which fields are visible by default when the chart initializes.
 *
 * When provided to ChartSchema:
 *
 * - Streams with a matching entry use the specified visibleFields
 * - Streams without an entry fall back to the presenter's defaultSeries
 * - An entry with an empty visibleFields set shows nothing for that stream
 *
 * @example
 *
 * ```ts
 * import {
 *   MARKET_DATA_OHLC_STREAM_IDENTIFIER,
 *   MARKET_DATA_PRICE_STREAM_IDENTIFIER,
 * } from "../../../../../../../../../data-providers/market-data-data-stream/types";
 *
 * const defaultVisibleFields: DefaultVisibleFields = [
 *   // Show only OHLC candlesticks
 *   { dataStreamIdentifier: MARKET_DATA_OHLC_STREAM_IDENTIFIER, visibleFields: new Set(['data.ohlc']) },
 *   // Hide price stream entirely
 *   { dataStreamIdentifier: MARKET_DATA_PRICE_STREAM_IDENTIFIER, visibleFields: new Set() },
 * ];
 * ```;
 * ```
 */
export type DefaultVisibleFields = ReadonlyArray<DefaultVisibleFieldsEntry>;
/**
 * DefaultVisibleFieldsEntry
 *
 * Configuration entry specifying which fields should be visible by default for a specific data stream.
 *
 * @example
 *
 * ```ts
 * import { MARKET_DATA_OHLC_STREAM_IDENTIFIER } from "../../../../../../../../../data-providers/market-data-data-stream/types";
 *
 * const defaultVisibleFields = [
 *   {
 *     dataStreamIdentifier: MARKET_DATA_OHLC_STREAM_IDENTIFIER,
 *     visibleFields: new Set(['data.ohlc']),
 *   },
 * ];
 * ```;
 * ```
 */
export type DefaultVisibleFieldsEntry = Readonly<{
    /**
     * The data stream this configuration applies to.
     */
    dataStreamIdentifier: DataStreamIdentifier;
    /**
     * Set of field paths to display by default for this stream. An empty set means "show nothing" for this stream.
     */
    visibleFields: ReadonlySet<SeriesPath>;
}>;
/**
 * DeferredSeriesNode
 *
 * Series field node that hasn't been materialized yet (no adapter or series API). Created when field is selected but
 * samples aren't available yet.
 */
export type DeferredSeriesNode = Readonly<{
    fieldPath: SeriesPath;
    id: SeriesId;
}>;
/**
 * GroupId
 *
 * Unique identifier for a series group within the chart schema.
 */
export type GroupId = string;
/**
 * MaterializedSeriesNode
 *
 * Series field node with adapter and chart series API. Created once samples are available.
 */
export type MaterializedSeriesNode = Readonly<{
    adapter: SeriesAdapterLike;
    fieldPath: SeriesPath;
    id: SeriesId;
    seriesApi: SeriesApiLike;
    seriesKind: SeriesType;
}>;
/**
 * PaneId
 *
 * Unique identifier for a chart pane.
 */
export type PaneId = string;
/**
 * PaneLayout
 *
 * A chart pane containing one or more series groups. Ordered array position determines visual stacking.
 */
export type PaneLayout = Readonly<{
    seriesGroups: ReadonlyArray<SeriesGroupLayout>;
    sortPriority?: number;
}>;
/**
 * PaneNode
 *
 * Represents a chart pane containing one or more series groups.
 */
export type PaneNode = {
    defaultHeight: number;
    id: PaneId;
    labelPrimitive?: AnchoredPanePrimitive;
    name?: string;
    paneApi: IPaneApi<Time>;
    seriesGroups: Map<GroupId, SeriesGroupNode>;
};
/**
 * PaneState
 *
 * Enriched pane node. Contains one or more series group states that the adapter maps to LWC pane APIs.
 */
export type PaneState = Readonly<{
    seriesGroups: ReadonlyArray<SeriesGroupState>;
}>;
/**
 * PartialLeafStructuralDescriptor
 *
 * Series field descriptor without seriesKind. Returned by inference presenters when they cannot determine the series
 * type from sample data alone.
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
export type PartialLeafStructuralDescriptor<TDataStreamId extends DataStreamIdentifier> = BaseFieldDescriptor<TDataStreamId> & Readonly<{
    kind: 'series';
}>;
/**
 * PerStreamDataState
 *
 * Per-stream data state derived inline by the `state` getter via type guard narrowing.
 *
 * - `cursor`: Provider-maintained cursor for incremental data fetching. `undefined` if no data yet.
 * - `dataLength`: Indicator-only. Length of the indicator's HasMany `data` relationship. Reading this establishes
 *   autotracking on the relationship so `@cached state` recomputes when data goes from empty → populated. `undefined`
 *   for market data streams.
 * - `projectionId`: Indicator-only. Changes when indicator config is rebuilt. `undefined` for market data streams.
 * - `dataHash`: Indicator-only. Changes when the latest signal bar mutates. `undefined` for market data streams.
 */
export type PerStreamDataState = Readonly<{
    cursor: DataProviderCursor | undefined;
    dataHash: string | undefined;
    dataLength: number | undefined;
    projectionId: string | undefined;
}>;
/**
 * PriceScaleLayout
 *
 * Configures how a series group is scaled within its pane. Groups sharing the same `id` share the same Y-axis scale.
 * When omitted, the series uses the pane's default right price scale.
 *
 * @example
 *
 * ```ts
 * // Volume overlay at the bottom 20% of the pane
 * const volumeScale: PriceScaleLayout = {
 *   id: 'volume',
 *   scaleMargins: { bottom: 0, top: 0.8 },
 * };
 * ```
 */
export type PriceScaleLayout = Readonly<{
    /**
     * Price scale identifier. Series groups sharing the same id within a pane share the same Y-axis. Use a descriptive
     * name (e.g., 'volume', 'rsi') — not 'left' or 'right' which are reserved by LWC.
     */
    id: string;
    /**
     * Vertical positioning within the pane as fractions (0–1). `top` is the distance from the top edge, `bottom` from the
     * bottom edge. Example: `{ top: 0.8, bottom: 0 }` confines the series to the bottom 20%.
     */
    scaleMargins?: ScaleMargins;
}>;
/**
 * ScaleMargins
 *
 * Vertical positioning of a price scale within a pane, expressed as fractions (0–1).
 */
export type ScaleMargins = Readonly<{
    bottom: number;
    top: number;
}>;
/**
 * SeriesGroupLayout
 *
 * Groups related series for a single data stream within a pane.
 *
 * `groupId` is the stable layout/runtime identity. `dataStreamId` is an optional live binding used by schema assembly
 * when multiple current streams share the same `streamType`.
 */
export type SeriesGroupLayout = Readonly<{
    dataStreamId?: string;
    groupId: GroupId;
    priceScale?: PriceScaleLayout;
    series: ReadonlyArray<SeriesLayout>;
    stableLayoutKey: string;
    streamType: string;
}>;
/**
 * SeriesGroupNode
 *
 * Represents a series group with its associated data stream and presenter. One group per data stream.
 *
 * Runtime storage uses the provider and presenter contracts rather than a registration-derived type.
 */
export type SeriesGroupNode = Readonly<{
    dataStreamIdentifier: DataStreamIdentifier;
    id: GroupId;
    presenter: DataStreamPresenterLike<DataProviderLike, DataStreamIdentifier>;
    series: Map<SeriesPath, SeriesNode>;
}>;
/**
 * SeriesGroupState
 *
 * Enriched series group node. Combines a provider, its presenter, per-stream data state, and the resolved series
 * visibility from the layout overlay. The adapter reads this to create/update LWC series handles.
 */
export type SeriesGroupState = Readonly<{
    dataState: PerStreamDataState;
    dataStreamIdentifier: DataStreamIdentifier;
    groupId: GroupId;
    presenter: DataStreamPresenterLike<DataProviderLike, DataStreamIdentifier>;
    priceScale?: PriceScaleLayout;
    provider: DataProviderLike;
    series: ReadonlyArray<SeriesState>;
    stableLayoutKey: string;
    streamType: string;
}>;
/**
 * SeriesId
 *
 * Unique identifier for a series within the chart.
 */
export type SeriesId = string;
/**
 * SeriesIdentifier
 *
 * Globally unique identifier for a series field across all providers, streams, and fields. Forms a natural hierarchy:
 * Provider → Stream → Field
 *
 * This identifier appears throughout the system:
 *
 * - Schema API methods (toggleSeries)
 * - Field descriptors (identifier property)
 * - UI components (selection checking)
 *
 * Note: Access the provider identifier via dataStreamIdentifier.dataProviderIdentifier
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type. When narrowed (e.g., to
 *   IndicatorProviderDataStreamIdentifier), preserves type information through the descriptor chain.
 */
export type SeriesIdentifier<TDataStreamId extends DataStreamIdentifier> = Readonly<{
    dataStreamIdentifier: TDataStreamId;
    fieldPath: SeriesPath;
}>;
/**
 * SeriesLayout
 *
 * Leaf node in the layout tree. Represents a single chart series (e.g., OHLC candlestick, volume histogram).
 */
export type SeriesLayout = Readonly<{
    fieldPath: SeriesPath;
    visible: boolean;
}>;
/**
 * SeriesNode
 *
 * Union of deferred and materialized series field nodes.
 */
export type SeriesNode = DeferredSeriesNode | MaterializedSeriesNode;
/**
 * SeriesPath
 *
 * Dot-notation path to a field within a data sample. Examples: 'data.ohlc', 'data.volume.buy', 'data.macd.signal'
 */
export type SeriesPath = `data.${string}` | `meta.${string}`;
/**
 * SeriesState
 *
 * Leaf node in the enriched tree. Represents a single chart series with its visibility flag from the layout overlay.
 */
export type SeriesState = Readonly<{
    fieldPath: SeriesPath;
    visible: boolean;
}>;
/**
 * StructuralGroupType
 *
 * Describes how fields within a structural group relate to each other:
 *
 * - 'faceted': Multiple views of the same data (e.g., volume buy/sell/total)
 * - 'composite': Related but independent series (e.g., MACD line/signal/histogram)
 */
export type StructuralGroupType = 'composite' | 'faceted';
/**
 * BaseFieldDescriptor
 *
 * Common properties shared by all field descriptors.
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
type BaseFieldDescriptor<TDataStreamId extends DataStreamIdentifier> = Readonly<{
    identifier: SeriesIdentifier<TDataStreamId>;
    label: string;
}>;
/**
 * LeafStructuralDescriptor
 *
 * Union of partial and complete series field descriptors.
 *
 * @template TDataStreamId - The specific DataStreamIdentifier type for type preservation through the chain.
 */
type LeafStructuralDescriptor<TDataStreamId extends DataStreamIdentifier> = CompleteLeafStructuralDescriptor<TDataStreamId> | PartialLeafStructuralDescriptor<TDataStreamId>;
/**
 * SeriesType
 *
 * LightweightCharts series types supported by the system.
 */
type SeriesType = 'area' | 'bar' | 'baseline' | 'candlestick' | 'histogram' | 'line';
export {};
//# sourceMappingURL=types.d.ts.map