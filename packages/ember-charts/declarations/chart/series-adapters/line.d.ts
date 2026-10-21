import type { ChartTimeSeriesPointNumber, SeriesAdapterWithDescriptor } from './_lib/_adapter';
import { type DeepPartial, type LineWidth } from 'lightweight-charts';
export type LinePoint = ChartTimeSeriesPointNumber;
export type LineSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: LineSeriesOptions;
    type: 'line';
};
export type LineSeriesOptions = {
    color?: string;
    lineWidth?: DeepPartial<LineWidth>;
    name?: string;
    priceScaleId?: string;
};
/**
 * Line series adapter: create/backfill/update for numeric line panes.
 */
export declare const lineAdapter: SeriesAdapterWithDescriptor<{
    datum: LinePoint;
    descriptor: LineSeriesDescriptor;
    external: 'Line';
    internal: 'line';
    options: LineSeriesOptions;
}>;
//# sourceMappingURL=line.d.ts.map