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

import type { SeriesAdapterLike } from './_adapter';
import type { NoSeriesAdapterForTypeError } from './_registry/errors';
import type { SeriesType } from './_registry/types';
import type {
  SeriesValueHandler,
  SeriesValueHandlers,
} from './value-handler/types';
import type { SeriesValueHandlerNotFoundError } from './value-handler/errors';

import { createNoSeriesAdapterForTypeError } from './_registry/errors';
import { numericSeriesValueHandler } from './value-handler';
import { NotFoundError } from '../../../vendor/shared-utils/errors/not-found-error';
import { areaAdapter } from '../area';
import { barAdapter } from '../bar';
import { baselineAdapter } from '../baseline';
import { candlestickAdapter } from '../candle-stick';
import { histogramAdapter } from '../histogram';
import { lineAdapter } from '../line';
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
  constructor({
    items = adapters,
    valueHandlers = [],
  }: {
    items?: ReadonlyArray<(typeof adapters)[number]>;
    valueHandlers?: SeriesValueHandlers;
  } = {}) {
    this.#map = new Map(items.map((adapter) => [adapter.id, adapter] as const));
    this.#valueHandlers = new Map(
      [numericSeriesValueHandler, ...valueHandlers].map(
        (handler) => [handler.id, handler] as const,
      ),
    );
  }

  /** Resolve a value handler by the identifier a descriptor names. */
  getValueHandler({
    id,
  }: {
    id?: string;
  }): Result<SeriesValueHandler, SeriesValueHandlerNotFoundError> {
    const handlerId = id ?? numericSeriesValueHandler.id;
    const handler = this.#valueHandlers.get(handlerId);
    if (handler !== undefined) return ok(handler);
    return err(
      NotFoundError.of({
        errorCode: 'SERIES_VALUE_HANDLER_NOT_FOUND',
        message: 'The series names an unregistered value handler.',
        meta: { handlerId },
        emitLog: false,
      }),
    );
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
  #valueHandlers: Map<string, SeriesValueHandler>;
}
