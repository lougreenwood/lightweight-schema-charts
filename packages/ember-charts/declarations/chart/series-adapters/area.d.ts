import type { ChartTimeSeriesPointNumber, SeriesAdapterWithDescriptor } from './_lib/_adapter';
import { type DeepPartial, type LineWidth } from 'lightweight-charts';
export type AreaPoint = ChartTimeSeriesPointNumber;
export type AreaSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: AreaSeriesOptions;
    type: 'area';
};
export type AreaSeriesOptions = {
    bottomColor?: string;
    lineColor?: string;
    lineWidth?: DeepPartial<LineWidth>;
    name?: string;
    priceScaleId?: string;
    topColor?: string;
};
/**
 * Area series adapter: create/backfill/update for numeric area panes.
 */
export declare const areaAdapter: SeriesAdapterWithDescriptor<{
    datum: AreaPoint;
    descriptor: AreaSeriesDescriptor;
    external: 'Area';
    internal: 'area';
    options: AreaSeriesOptions;
}>;
//# sourceMappingURL=area.d.ts.map