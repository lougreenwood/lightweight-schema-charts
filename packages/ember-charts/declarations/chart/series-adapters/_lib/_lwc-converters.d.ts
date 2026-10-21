/**
 * Adapter-side LWC converter helpers.
 *
 * These helpers live behind the adapter boundary to keep Lightweight Charts (LWC) coupling out of providers. Adapters
 * use these utilities to convert provider-agnostic primitives into LWC-friendly payloads.
 *
 * Conventions:
 *
 * - Provider-side primitives (time-series points) use Date for time.
 * - Adapters convert Date -> UTCTimestamp (seconds) using toLwcTime().
 * - Backfill containers should be ReadonlySet<T>; adapters convert Set -> Array at the boundary.
 *
 * Notes:
 *
 * - Helpers are minimal and structural to remain assignable to LWC data types (e.g., LineData, AreaData, HistogramData,
 *   CandlestickData).
 */
import type { ChartTimeSeriesPointNumber, ChartTimeSeriesPointOhlc } from './_adapter';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
/**
 * Minimal numeric data shape accepted by LWC numeric series (line/area/histogram). Kept lightweight to be assignable to
 * LineData/AreaData/HistogramData structurally.
 */
export type LwcNumberDataPoint = {
    time: UTCTimestamp;
    value: number;
};
/**
 * Convert a Set of numeric points into an Array of LWC numeric data points. Adapters should use this to map provider
 * backfill (ReadonlySet) to LWC arrays.
 */
export declare function mapNumberSetToLwcArray(points: ReadonlySet<ChartTimeSeriesPointNumber>): LwcNumberDataPoint[];
/**
 * Convert a Set of OHLC points into an Array of LWC CandlestickData points.
 */
export declare function mapOhlcSetToCandles(points: ReadonlySet<ChartTimeSeriesPointOhlc>): CandlestickData[];
export declare function sortNumberPointsAscending({ points, }: {
    points: Iterable<ChartTimeSeriesPointNumber>;
}): ChartTimeSeriesPointNumber[];
export declare function sortOhlcPointsAscending({ points, }: {
    points: Iterable<ChartTimeSeriesPointOhlc>;
}): ChartTimeSeriesPointOhlc[];
/**
 * Convert a numeric point into an LWC numeric data point.
 */
export declare function numberPointToLwc(point: ChartTimeSeriesPointNumber): LwcNumberDataPoint;
/**
 * Convert an OHLC point to an LWC CandlestickData point.
 */
export declare function ohlcPointToLwc({ time, value, }: ChartTimeSeriesPointOhlc): CandlestickData;
/**
 * Convert a Date to Lightweight Charts UTCTimestamp (seconds since epoch).
 */
export declare function toLwcTime(date: Date): UTCTimestamp;
//# sourceMappingURL=_lwc-converters.d.ts.map