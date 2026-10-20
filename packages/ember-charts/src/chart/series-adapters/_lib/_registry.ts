/**
 * Programmatic series adapter registry and derived types.
 *
 * Design:
 *
 * - Bottom-up authority: adapters define their own internal key (`type`) and external LWC series type (`lwcSeriesType`).
 * - The registry is built from a const tuple of adapters; everything else (unions, helpers) is derived from it.
 * - No `any` usage; `unknown` where appropriate.
 *
 * Adapters must:
 *
 * - Export a constant adapter (e.g., `areaAdapter`) with shape: { type: 'area', lwcSeriesType: 'Area', create({ ctx,
 *   options }), backfill({ api, data }), update({ api, data }) }
 */

import type { SeriesAdapterLike } from '#src/chart/series-adapters/_lib/_adapter';
import type { NoSeriesAdapterForTypeError } from '#src/chart/series-adapters/_lib/_registry/errors';
import type { SeriesType } from '#src/chart/series-adapters/_lib/_registry/types';

import { createNoSeriesAdapterForTypeError } from '#src/chart/series-adapters/_lib/_registry/errors';
import { areaAdapter } from '#src/chart/series-adapters/area';
import { barAdapter } from '#src/chart/series-adapters/bar';
import { baselineAdapter } from '#src/chart/series-adapters/baseline';
import { candlestickAdapter } from '#src/chart/series-adapters/candle-stick';
import { histogramAdapter } from '#src/chart/series-adapters/histogram';
import { lineAdapter } from '#src/chart/series-adapters/line';
import Result, { err, ok } from 'true-myth/result';

export const adapters = [
  areaAdapter,
  baselineAdapter,
  barAdapter,
  candlestickAdapter,
  histogramAdapter,
  lineAdapter,
] as const;

/**
 * SeriesAdapterRegistry encapsulates adapter lookup state and APIs.
 */
export class SeriesAdapterRegistry {
  constructor(items: ReadonlyArray<(typeof adapters)[number]> = adapters) {
    this.#map = new Map(items.map((adapter) => [adapter.id, adapter] as const));
  }

  /**
   * Lookup an adapter by internal series type id. Returns Result.ok(adapter) or
   * Result.err(NoSeriesAdapterForTypeError).
   */
  getAdapterByType(
    type: SeriesType,
  ): Result<SeriesAdapterLike, NoSeriesAdapterForTypeError> {
    const found = this.#map.get(type);
    return found
      ? ok(found)
      : err(createNoSeriesAdapterForTypeError({ seriesType: type }));
  }

  #map: Map<string, SeriesAdapterLike>;
}
