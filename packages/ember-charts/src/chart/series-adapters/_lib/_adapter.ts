/**
 * Base SeriesAdapter interface and supporting types.
 *
 * Goals:
 *
 * - Bottom-up authority: adapters define their own `id` (internal lowercase) and `seriesType` (external LWC literal).
 * - Object-arg functions for clarity and extensibility: create({ ctx, options }), backfill({ api, data }), update({ api,
 *   data }).
 * - Set-based backfill data for homogeneous collections; adapters convert Set -> Array at the LWC boundary.
 *
 * Adapters should not import from this module cyclically (keep adapter implementations decoupled).
 */

import type { PaneSeriesApiFor, SeriesType } from './_registry/types';
import type {
  DeepPartial,
  IChartApi,
  ISeriesApi,
  SeriesType as LwcSeriesType,
  SeriesOptionsMap,
} from 'lightweight-charts';

/**
 * Optional shape for registry entries: ties the external series type to its adapter. Useful when building a
 * programmatic registry from a tuple of adapters.
 */
export type AdapterRegistryEntry<Adapter extends SeriesAdapterLike> = {
  adapter: Adapter;
  seriesType: Adapter['seriesType'];
};

/**
 * Arguments for applying options to an existing series.
 */
export type ApplyOptionsArgs<
  TExternal extends LwcSeriesType,
  TOptions extends BaseSeriesOptions,
> = {
  options: Partial<TOptions>;
  seriesApi: ISeriesApi<TExternal>;
};

/**
 * Backfill arguments expect a ReadonlySet of homogeneous data.
 */
export type BackfillSeriesArgs<
  TExternal extends LwcSeriesType,
  TDatum extends SeriesAdapterInternalPoint,
> = {
  data: ReadonlySet<TDatum>;
  seriesApi: ISeriesApi<TExternal>;
};

/**
 * Base options shared by all series adapters.
 *
 * Uses `name` as our internal term; adapters translate to LWC's `title` at the boundary.
 */
export type SeriesPriceFormat = Readonly<{
  type: 'custom';
  formatter: (value: number) => string;
}>;

export type BaseSeriesOptions = {
  name?: string;
  priceScaleId?: string;
  priceFormat?: SeriesPriceFormat;
};

/**
 * A single numeric value at a point in time. Suitable for numeric series: line, area, histogram.
 */
export type ChartTimeSeriesPointNumber = {
  time: Date;
  value: number;
};

export type ChartTimeSeriesPointOhlc = {
  time: Date;
  value: {
    close: number;
    high: number;
    low: number;
    open: number;
  };
};

/**
 * Args for creating a series.
 *
 * TOptions: adapter-specific options type (extends BaseSeriesOptions) TContext: adapter-specific creation context
 * (e.g., chart API, pane index)
 */
export type CreateSeriesArgs<
  TOptions extends BaseSeriesOptions,
  TContext extends CreateSeriesArgsContext = CreateSeriesArgsContext,
> = {
  context: TContext;
  options?: TOptions;
};

export interface CreateSeriesArgsContext {
  chart: IChartApi;
  paneIndex: number;
  seriesKey: string;
}

export type CreateSeriesResult<TInternal extends SeriesType> = {
  seriesApi: PaneSeriesApiFor<TInternal>;
};

/**
 * LWC options shape after translation from internal options.
 *
 * Replaces our internal `name` field with LWC's `title` field.
 */
export type LwcSeriesOptions<TOptions extends BaseSeriesOptions> = Omit<
  TOptions,
  'name'
> & { title?: string };

/**
 * Union of all LWC series options types.
 */
export type LwcSeriesOptionsUnion = SeriesOptionsMap[LwcSeriesType];

/**
 * Base SeriesAdapter contract.
 *
 * TInternal: internal lowercase key (e.g., 'area') TExternal: external LWC series type literal (e.g., 'Area') TOptions:
 * adapter-specific options type TCreateCtx: adapter-specific creation context type TBackfillDatum: datum type for
 * backfill (Set-based) TUpdateDatum: datum type for updates (single)
 *
 * Notes:
 *
 * - Methods are synchronous by default; if you need richer error handling, return a Result type in the concrete adapters.
 * - Keep adapters decoupled from UI state; they should be pure boundaries to LWC.
 */
export interface SeriesAdapter<
  TInternal extends SeriesType,
  TExternal extends LwcSeriesType,
  TOptions extends BaseSeriesOptions,
  TBackfillDatum extends SeriesAdapterInternalPoint,
  TUpdateDatum extends SeriesAdapterInternalPoint,
  TCreateCtx extends CreateSeriesArgsContext = CreateSeriesArgsContext,
> {
  readonly id: TInternal; // internal lowercase id
  readonly seriesType: TExternal; // external LWC series literal
  applyOptions(args: ApplyOptionsArgs<TExternal, TOptions>): void;

  backfillSeries(args: BackfillSeriesArgs<TExternal, TBackfillDatum>): void;
  createSeries(
    args: CreateSeriesArgs<TOptions, TCreateCtx>,
  ): CreateSeriesResult<TInternal>;
  updateSeries(args: UpdateSeriesArgs<TExternal, TUpdateDatum>): void;
}

export type SeriesAdapterInternalPoint =
  ChartTimeSeriesPointNumber | ChartTimeSeriesPointOhlc;

/**
 * Helper alias for working with heterogeneous adapter collections (e.g., registries).
 */
export type SeriesAdapterLike = SeriesAdapter<
  SeriesType,
  LwcSeriesType,
  BaseSeriesOptions,
  SeriesAdapterInternalPoint,
  SeriesAdapterInternalPoint
>;

/**
 * Series adapter with descriptor brand, using TOpts pattern.
 *
 * Example usage:
 *
 * ```ts
 * const areaAdapter: SeriesAdapterWithDescriptor<{
 *   internal: 'area';
 *   external: 'Area';
 *   options: AreaSeriesOptions;
 *   datum: AreaPoint;
 *   descriptor: AreaSeriesDescriptor;
 * }> = { ... };
 * ```
 *
 * If backfill and update need different datum types (rare), specify `updateDatum`:
 *
 * ```ts
 * const customAdapter: SeriesAdapterWithDescriptor<{
 *   internal: 'custom';
 *   external: 'Custom';
 *   options: CustomSeriesOptions;
 *   datum: BackfillPoint;
 *   updateDatum: UpdatePoint;
 *   descriptor: CustomSeriesDescriptor;
 * }> = { ... };
 * ```
 */
export type SeriesAdapterWithDescriptor<
  TOpts extends SeriesAdapterWithDescriptorTOpts,
> = SeriesAdapter<
  TOpts['internal'],
  TOpts['external'],
  TOpts['options'],
  TOpts['datum'],
  ResolveUpdateDatum<TOpts>,
  ResolveCreateContext<TOpts>
> & {
  readonly descriptorBrand?: TOpts['descriptor'];
};

/**
 * TOpts shape for SeriesAdapterWithDescriptor.
 *
 * Uses TOpts pattern (complete specification) with optional `updateDatum` that defaults to `datum` when not specified.
 * This eliminates the common duplication where backfill and update use the same datum type.
 */
export type SeriesAdapterWithDescriptorTOpts = {
  /**
   * Creation context type (defaults to CreateSeriesArgsContext if not specified).
   */
  createContext?: CreateSeriesArgsContext;
  /**
   * Datum type for backfill operations, and for update operations if updateDatum is not specified.
   */
  datum: SeriesAdapterInternalPoint;
  /**
   * Descriptor type for the adapter (e.g., AreaSeriesDescriptor).
   */
  descriptor: unknown;
  /**
   * External LWC series type literal (e.g., 'Area').
   */
  external: LwcSeriesType;
  /**
   * Internal lowercase series key (e.g., 'area').
   */
  internal: SeriesType;
  /**
   * Adapter-specific options type (e.g., AreaSeriesOptions).
   */
  options: BaseSeriesOptions;
  /**
   * Optional override for update datum type. If not specified, uses `datum`.
   */
  updateDatum?: SeriesAdapterInternalPoint;
};

/**
 * Union-friendly alias for a series API bound to any supported LWC series type.
 */
export type SeriesApiLike = ISeriesApi<LwcSeriesType>;

/**
 * Args for applying incremental updates to a series.
 *
 * TExternal: the external LWC series type literal (e.g., 'Area') TDatum: the adapter-specific datum type for an update
 */
export type UpdateSeriesArgs<
  TExternal extends LwcSeriesType,
  TDatum extends SeriesAdapterInternalPoint,
> = {
  data: ReadonlySet<TDatum>;
  seriesApi: ISeriesApi<TExternal>;
};

/**
 * Resolves the create context type from TOpts.
 *
 * If `createContext` is specified in TOpts, uses that; otherwise falls back to CreateSeriesArgsContext.
 */
type ResolveCreateContext<TOpts extends SeriesAdapterWithDescriptorTOpts> =
  undefined extends TOpts['createContext']
    ? CreateSeriesArgsContext
    : NonNullable<TOpts['createContext']>;

/**
 * Resolves the update datum type from TOpts.
 *
 * If `updateDatum` is specified in TOpts, uses that; otherwise falls back to `datum`.
 */
type ResolveUpdateDatum<TOpts extends SeriesAdapterWithDescriptorTOpts> =
  undefined extends TOpts['updateDatum']
    ? TOpts['datum']
    : NonNullable<TOpts['updateDatum']>;

/**
 * Translate internal options (with `name`) to LWC options (with `title`).
 *
 * Removes the `name` field and adds the `title` field. This keeps our internal API consistent (using `name`) while
 * adapting to LWC's terminology (`title`) at the boundary.
 *
 * Generic over `TLwcOptions`: Constrained to the union of known LWC series options types. TypeScript infers this from
 * the call-site context (e.g., `seriesApi.applyOptions(translateOptionsToLwc(options))`).
 *
 * Always returns `DeepPartial<TLwcOptions>` (never `undefined`) to be compatible with LWC's `applyOptions` and
 * `addSeries` signatures. When input options are `undefined`, returns an empty object which is valid for `DeepPartial`
 * (all properties optional).
 */
export function translateOptionsToLwc<
  TLwcOptions extends LwcSeriesOptionsUnion,
>(options: BaseSeriesOptions | undefined): DeepPartial<TLwcOptions> {
  if (!options) return {} as DeepPartial<TLwcOptions>;

  const { name, ...rest } = options;
  return { ...rest, title: name } as DeepPartial<TLwcOptions>;
}
