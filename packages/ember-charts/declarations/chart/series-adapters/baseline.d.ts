import type { ChartTimeSeriesPointNumber, SeriesAdapterWithDescriptor } from './_lib/_adapter';
export type BaselinePoint = ChartTimeSeriesPointNumber;
export type BaselineSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: BaselineSeriesOptions;
    type: 'baseline';
};
export type BaselineSeriesOptions = {
    name?: string;
    priceScaleId?: string;
};
/**
 * Baseline series adapter: create/backfill/update for numeric panes.
 */
export declare const baselineAdapter: SeriesAdapterWithDescriptor<{
    datum: BaselinePoint;
    descriptor: BaselineSeriesDescriptor;
    external: 'Baseline';
    internal: 'baseline';
    options: BaselineSeriesOptions;
}>;
//# sourceMappingURL=baseline.d.ts.map