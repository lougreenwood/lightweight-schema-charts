import type { ChartTimeSeriesPointOhlc, SeriesAdapterWithDescriptor } from './_lib/_adapter';
export type BarPoint = ChartTimeSeriesPointOhlc;
export type BarSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: BarSeriesOptions;
    type: 'bar';
};
export type BarSeriesOptions = {
    name?: string;
    priceScaleId?: string;
};
/**
 * Bar series adapter: create/backfill/update for OHLC panes rendered as bars.
 */
export declare const barAdapter: SeriesAdapterWithDescriptor<{
    datum: BarPoint;
    descriptor: BarSeriesDescriptor;
    external: 'Bar';
    internal: 'bar';
    options: BarSeriesOptions;
}>;
//# sourceMappingURL=bar.d.ts.map