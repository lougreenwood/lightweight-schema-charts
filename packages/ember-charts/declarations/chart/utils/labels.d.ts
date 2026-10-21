/**
 * Label Utilities
 *
 * Provides utility functions for generating labels for chart series and panes. Implements redundancy removal logic to
 * create clean, readable labels from hierarchical data structure (Provider → Stream → Field).
 *
 * Key functions:
 *
 * - BuildSeriesLabel: Generate full hierarchical label with redundancy removal
 * - BuildSeriesTitle: Generate abbreviated title for native series title property
 * - BuildPaneLabel: Generate pane label with special handling for first pane
 */
import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { BaseStructuralDescriptor } from '../schema/types';
/**
 * BuildPaneLabelArgs
 *
 * Arguments for building a pane label.
 */
export interface BuildPaneLabelArgs {
    /**
     * First series field descriptor in the pane
     */
    fieldDescriptor: BaseStructuralDescriptor<DataStreamIdentifier>;
    /**
     * Whether this is the first pane in the chart
     */
    isFirstPane: boolean;
    /**
     * Parent field descriptor if this is a child field
     */
    parentDescriptor?: BaseStructuralDescriptor<DataStreamIdentifier>;
    /**
     * Human-readable provider name
     */
    providerName: string;
    /**
     * Stream type identifier
     */
    streamType: string;
    /**
     * Timeframe label (e.g., "1m", "5m", "1h") - appended in brackets at end of label
     */
    timeframeLabel?: string;
    /**
     * TradableAssetPair name (e.g., "WETH/USDC - Uniswap V2")
     */
    tradableAssetPairName?: string;
}
/**
 * BuildSeriesLabelArgs
 *
 * Arguments for building a series label.
 */
export interface BuildSeriesLabelArgs {
    /**
     * Field descriptor for this series
     */
    fieldDescriptor: BaseStructuralDescriptor<DataStreamIdentifier>;
    /**
     * Parent field descriptor if this is a child field
     */
    parentDescriptor?: BaseStructuralDescriptor<DataStreamIdentifier>;
    /**
     * Human-readable provider name (e.g., "MarketDataData", "MyStrategy")
     */
    providerName: string;
    /**
     * Stream type identifier (e.g., "ohlc", "volume", "ema")
     */
    streamType: string;
}
/**
 * BuildSeriesTitleArgs
 *
 * Arguments for building a series title (abbreviated).
 */
export interface BuildSeriesTitleArgs {
    /**
     * Field descriptor for this series
     */
    fieldDescriptor: BaseStructuralDescriptor<DataStreamIdentifier>;
    /**
     * Parent field descriptor if this is a child field
     */
    parentDescriptor?: BaseStructuralDescriptor<DataStreamIdentifier>;
}
/**
 * Build a pane label with special handling for the first pane.
 *
 * First pane pattern: {TradableAssetPairName} | {SeriesLabel} [timeframe] Other panes pattern: {SeriesLabel}
 * [timeframe]
 *
 * Examples:
 *
 * - First pane: "WETH/USDC - Uniswap V2 | MarketDataData - ohlc [1m]"
 * - Other panes: "MyStrategy - macd [5m]"
 */
export declare function buildPaneLabel(args: BuildPaneLabelArgs): string;
/**
 * Build a full hierarchical series label with redundancy removal.
 *
 * Pattern: {ProviderName} - {StreamType} - {FieldLabel} with redundancy removal applied. For structural field children,
 * combines parent and child as "Parent > Child".
 *
 * Examples:
 *
 * - MarketDataData - ohlc (was: MarketDataData - ohlc - OHLC)
 * - MarketDataData - Volume > Buy (for faceted volume.buy)
 * - MarketDataData - Traders > Total (for faceted traders.total)
 * - MyStrategy - EMA (was: MyStrategy - ema - EMA)
 * - MyStrategy - macd - Histogram (was: MyStrategy - macd - MACD - Histogram)
 */
export declare function buildSeriesLabel(args: BuildSeriesLabelArgs): string;
/**
 * Build an abbreviated series title for the native LightweightCharts title property.
 *
 * Rules:
 *
 * - Structural field children: Use "Parent > Child" format (e.g., "Volume > Buy", "Trades > Total")
 * - Non-structural fields: Use the field label (e.g., "OHLC", "EMA 20")
 *
 * Examples:
 *
 * - "OHLC"
 * - "EMA 20"
 * - "Volume > Buy" (for volume.buy)
 * - "Traders > Total" (for traders.total)
 */
export declare function buildSeriesTitle(args: BuildSeriesTitleArgs): string;
/**
 * Extract stream type from a data stream identifier.
 */
export declare function getStreamTypeFromIdentifier(identifier: DataStreamIdentifier): string;
/**
 * Extract provider name from a data provider identifier.
 *
 * For now, this uses the provider type. In the future, we might want to use a more descriptive name from the provider
 * instance itself.
 */
export declare function humanizeChartFieldLabel({ fieldName, }: {
    fieldName: string;
}): string;
//# sourceMappingURL=labels.d.ts.map