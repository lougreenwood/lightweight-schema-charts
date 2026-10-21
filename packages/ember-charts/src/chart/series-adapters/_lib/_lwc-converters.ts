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

import type {
  ChartTimeSeriesPointNumber,
  ChartTimeSeriesPointOhlc,
} from './_adapter';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

function sortTimeSeriesPointsAscending<TPoint extends { time: Date }>({
  points,
}: {
  points: Iterable<TPoint>;
}): TPoint[] {
  return Array.from(points).toSorted(
    (left, right) => left.time.getTime() - right.time.getTime(),
  );
}

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
export function mapNumberSetToLwcArray(
  points: ReadonlySet<ChartTimeSeriesPointNumber>,
): LwcNumberDataPoint[] {
  return sortTimeSeriesPointsAscending({ points })
    .values()
    .map(numberPointToLwc)
    .toArray();
}

/**
 * Convert a Set of OHLC points into an Array of LWC CandlestickData points.
 */
export function mapOhlcSetToCandles(
  points: ReadonlySet<ChartTimeSeriesPointOhlc>,
): CandlestickData[] {
  return sortTimeSeriesPointsAscending({ points })
    .values()
    .map(ohlcPointToLwc)
    .toArray();
}

export function sortNumberPointsAscending({
  points,
}: {
  points: Iterable<ChartTimeSeriesPointNumber>;
}): ChartTimeSeriesPointNumber[] {
  return sortTimeSeriesPointsAscending({ points });
}

export function sortOhlcPointsAscending({
  points,
}: {
  points: Iterable<ChartTimeSeriesPointOhlc>;
}): ChartTimeSeriesPointOhlc[] {
  return sortTimeSeriesPointsAscending({ points });
}

/**
 * Convert a numeric point into an LWC numeric data point.
 */
export function numberPointToLwc(
  point: ChartTimeSeriesPointNumber,
): LwcNumberDataPoint {
  return {
    ...point,
    time: toLwcTime(point.time),
  };
}

/**
 * Convert an OHLC point to an LWC CandlestickData point.
 */
export function ohlcPointToLwc({
  time,
  value,
}: ChartTimeSeriesPointOhlc): CandlestickData {
  return {
    close: value.close,
    high: value.high,
    low: value.low,
    open: value.open,
    time: toLwcTime(time),
  };
}

/**
 * Convert a Date to Lightweight Charts UTCTimestamp (seconds since epoch).
 */
export function toLwcTime(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}
