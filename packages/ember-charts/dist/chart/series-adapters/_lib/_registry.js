import { createNoSeriesAdapterForTypeError } from './_registry/errors.js';
import { numericSeriesValueHandler } from './value-handler.js';
import { NotFoundError } from '../../../vendor/shared-utils/errors/not-found-error.js';
import { areaAdapter } from '../area.js';
import { barAdapter } from '../bar.js';
import { baselineAdapter } from '../baseline.js';
import { candlestickAdapter } from '../candle-stick.js';
import { histogramAdapter } from '../histogram.js';
import { lineAdapter } from '../line.js';
import { ok, err } from 'true-myth/result';

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

const adapters = [areaAdapter, baselineAdapter, barAdapter, candlestickAdapter, histogramAdapter, lineAdapter];

/**
 * SeriesAdapterRegistry encapsulates adapter lookup state and APIs.
 */
class SeriesAdapterRegistry {
  constructor({
    items = adapters,
    valueHandlers = []
  } = {}) {
    this.#map = new Map(items.map(adapter => [adapter.id, adapter]));
    this.#valueHandlers = new Map([numericSeriesValueHandler, ...valueHandlers].map(handler => [handler.id, handler]));
  }

  /** Resolve a value handler by the identifier a descriptor names. */
  getValueHandler({
    id
  }) {
    const handlerId = id ?? numericSeriesValueHandler.id;
    const handler = this.#valueHandlers.get(handlerId);
    if (handler !== undefined) return ok(handler);
    return err(NotFoundError.of({
      errorCode: 'SERIES_VALUE_HANDLER_NOT_FOUND',
      message: 'The series names an unregistered value handler.',
      meta: {
        handlerId
      },
      emitLog: false
    }));
  }

  /**
   * Lookup an adapter by internal series type id. Returns Result.ok(adapter) or
   * Result.err(NoSeriesAdapterForTypeError).
   */
  getAdapterByType(type) {
    const found = this.#map.get(type);
    return found ? ok(found) : err(createNoSeriesAdapterForTypeError({
      seriesType: type
    }));
  }
  #map;
  #valueHandlers;
}

export { SeriesAdapterRegistry, adapters };
//# sourceMappingURL=_registry.js.map
