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
import type { SeriesValueHandler, SeriesValueHandlers } from './value-handler/types';
import type { SeriesValueHandlerNotFoundError } from './value-handler/errors';
import Result from 'true-myth/result';
export declare const adapters: readonly [import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../area").AreaPoint;
    descriptor: import("../area").AreaSeriesDescriptor;
    external: "Area";
    internal: "area";
    options: import("../area").AreaSeriesOptions;
}>, import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../baseline").BaselinePoint;
    descriptor: import("../baseline").BaselineSeriesDescriptor;
    external: "Baseline";
    internal: "baseline";
    options: import("../baseline").BaselineSeriesOptions;
}>, import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../bar").BarPoint;
    descriptor: import("../bar").BarSeriesDescriptor;
    external: "Bar";
    internal: "bar";
    options: import("../bar").BarSeriesOptions;
}>, import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../candle-stick").CandleStickPoint;
    descriptor: import("../candle-stick").CandlestickSeriesDescriptor;
    external: "Candlestick";
    internal: "candlestick";
    options: import("../candle-stick").CandlestickSeriesOptions;
}>, import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../histogram").HistogramPoint;
    descriptor: import("../histogram").HistogramSeriesDescriptor;
    external: "Histogram";
    internal: "histogram";
    options: import("../histogram").HistogramSeriesOptions;
}>, import("./_adapter").SeriesAdapterWithDescriptor<{
    datum: import("../line").LinePoint;
    descriptor: import("../line").LineSeriesDescriptor;
    external: "Line";
    internal: "line";
    options: import("../line").LineSeriesOptions;
}>];
/**
 * SeriesAdapterRegistry encapsulates adapter lookup state and APIs.
 */
export declare class SeriesAdapterRegistry {
    #private;
    constructor({ items, valueHandlers, }?: {
        items?: ReadonlyArray<(typeof adapters)[number]>;
        valueHandlers?: SeriesValueHandlers;
    });
    /** Resolve a value handler by the identifier a descriptor names. */
    getValueHandler({ id, }: {
        id?: string;
    }): Result<SeriesValueHandler, SeriesValueHandlerNotFoundError>;
    /**
     * Lookup an adapter by internal series type id. Returns Result.ok(adapter) or
     * Result.err(NoSeriesAdapterForTypeError).
     */
    getAdapterByType(type: SeriesType): Result<SeriesAdapterLike, NoSeriesAdapterForTypeError>;
}
//# sourceMappingURL=_registry.d.ts.map