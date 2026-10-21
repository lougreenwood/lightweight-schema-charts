/**
 * Chart Theme
 *
 * Provides lightweight-charts theme options derived from CSS variables. This allows the chart to automatically adapt to
 * whatever Frontile theme is active.
 *
 * Since lightweight-charts renders to canvas, it cannot use CSS variables directly. This utility reads the computed CSS
 * variable values at runtime and returns a configuration object compatible with lightweight-charts.
 *
 * IMPORTANT: lightweight-charts only supports hex/rgb/rgba colors, not oklch(). We must convert all CSS variable values
 * to hex format before passing to the chart library.
 *
 * Usage:
 *
 * ```ts
 * import { getChartTheme } from "./chart-theme";
 *
 * const chart = createChart(element, {
 *   ...getChartTheme(),
 *   // other options...
 * });
 * ```
 */
import type { ChartOptions, DeepPartial } from 'lightweight-charts';
/**
 * Get candlestick series options with theme colors.
 */
export declare function getCandlestickColors(): {
    borderDownColor: string;
    borderUpColor: string;
    downColor: string;
    upColor: string;
    wickDownColor: string;
    wickUpColor: string;
};
/**
 * Get chart theme options derived from current CSS variables.
 *
 * Call this when creating the chart to get theme-aware colors. If CSS variables change (theme switch), you'll need to
 * recreate the chart or call chart.applyOptions() with fresh theme values.
 */
export declare function getChartTheme(): DeepPartial<ChartOptions>;
/**
 * Get color for pane labels (series names displayed on chart). Uses neutral-medium for readable but not overpowering
 * text.
 */
export declare function getPaneLabelColor(): string;
/**
 * Get semantic colors for series (candlesticks, lines, etc.)
 *
 * Returns colors that match the current theme for:
 *
 * - UpColor: Price increase (green/success)
 * - DownColor: Price decrease (red/danger)
 * - LineColor: Default line color (brand/purple)
 */
export declare function getSeriesColors(): {
    downColor: string;
    lineColor: string;
    upColor: string;
    volumeColor: string;
};
//# sourceMappingURL=chart-theme.d.ts.map