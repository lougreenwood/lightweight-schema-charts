import type { ChartTimeSeriesPointOhlc, SeriesAdapterWithDescriptor } from './_lib/_adapter';
export type CandleStickPoint = ChartTimeSeriesPointOhlc;
export type CandlestickSeriesDescriptor = {
    dataKey?: string;
    key?: string;
    options?: CandlestickSeriesOptions;
    type: 'candlestick';
};
export type CandlestickSeriesOptions = {
    name?: string;
    priceScaleId?: string;
};
/**
 * Candlestick series adapter: create/backfill/update for OHLC panes.
 */
export declare const candlestickAdapter: SeriesAdapterWithDescriptor<{
    datum: CandleStickPoint;
    descriptor: CandlestickSeriesDescriptor;
    external: 'Candlestick';
    internal: 'candlestick';
    options: CandlestickSeriesOptions;
}>;
//# sourceMappingURL=candle-stick.d.ts.map