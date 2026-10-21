import type { IPaneApi, ISeriesApi, Time } from 'lightweight-charts';
import { adapters } from '../_registry';
/**
 * Generic mapping from internal SeriesType -> corresponding LWC series type literal.
 */
export type LwcTypeFor<T extends SeriesType> = Extract<(typeof adapters)[number], {
    id: T;
}>['seriesType'];
export type NumericSeriesType = Extract<SeriesType, 'area' | 'baseline' | 'histogram' | 'line'>;
export type OhlcSeriesType = Extract<SeriesType, 'bar' | 'candlestick'>;
export type PaneRef = IPaneApi<Time>;
/**
 * Generic pane ref for a specific internal type.
 */
export type PaneRefFor<T extends SeriesType> = IPaneApi<PaneSeriesApiFor<T>>;
/**
 * Union of series APIs for all supported LWC series types.
 */
export type PaneSeriesApi = {
    [K in SupportedLwcSeriesType]: ISeriesApi<K>;
}[SupportedLwcSeriesType];
/**
 * Generic series API for a specific internal type.
 */
export type PaneSeriesApiFor<T extends SeriesType> = ISeriesApi<LwcTypeFor<T>>;
export type SeriesDescriptor = NonNullable<AdaptersTuple[number]['descriptorBrand']>;
export type SeriesDescriptorByType = {
    [K in SeriesType]: SeriesDescriptorOf<K>;
};
export type SeriesDescriptorOf<T extends SeriesType> = NonNullable<Extract<AdaptersTuple[number], {
    id: T;
}>['descriptorBrand']>;
export type SeriesListOf<T extends SeriesType> = SeriesDescriptorOf<T> | SeriesDescriptorOf<T>[];
/**
 * Internal series type union (lowercase) derived from adapter keys. e.g., 'area' | 'candlestick' | 'histogram' | 'line'
 */
export type SeriesType = (typeof adapters)[number]['id'];
/**
 * Supported LWC series type union (uppercase) derived from registry values. e.g., 'Area' | 'Candlestick' | 'Histogram'
 *
 * | 'Line'
 */
export type SupportedLwcSeriesType = (typeof adapters)[number]['seriesType'];
/**
 * Derive SeriesDescriptor and related mapped types directly from the adapters tuple. Each adapter carries a phantom
 * `descriptorBrand` type via its declaration type.
 */
type AdaptersTuple = typeof adapters;
export {};
//# sourceMappingURL=types.d.ts.map