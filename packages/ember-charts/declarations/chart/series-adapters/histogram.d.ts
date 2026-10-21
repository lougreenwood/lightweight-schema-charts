import type { ChartTimeSeriesPointNumber, SeriesAdapterWithDescriptor } from './_lib/_adapter';
export type HistogramPoint = ChartTimeSeriesPointNumber;
export type HistogramSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: HistogramSeriesOptions;
    type: 'histogram';
};
export type HistogramSeriesOptions = {
    color?: string;
    name?: string;
    priceScaleId?: string;
};
/**
 * Conversion handled by adapter-side helpers in _lwc-converters.ts
 */
/**
 * Histogram series adapter: create/backfill/update for numeric histogram panes (e.g., Volume, MACD hist).
 */
export declare const histogramAdapter: SeriesAdapterWithDescriptor<{
    datum: HistogramPoint;
    descriptor: HistogramSeriesDescriptor;
    external: 'Histogram';
    internal: 'histogram';
    options: HistogramSeriesOptions;
}>;
//# sourceMappingURL=histogram.d.ts.map