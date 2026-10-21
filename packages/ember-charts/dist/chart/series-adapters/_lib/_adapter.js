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

/**
 * Optional shape for registry entries: ties the external series type to its adapter. Useful when building a
 * programmatic registry from a tuple of adapters.
 */

/**
 * Arguments for applying options to an existing series.
 */

/**
 * Backfill arguments expect a ReadonlySet of homogeneous data.
 */

/**
 * Base options shared by all series adapters.
 *
 * Uses `name` as our internal term; adapters translate to LWC's `title` at the boundary.
 */

/**
 * A single numeric value at a point in time. Suitable for numeric series: line, area, histogram.
 */

/**
 * Args for creating a series.
 *
 * TOptions: adapter-specific options type (extends BaseSeriesOptions) TContext: adapter-specific creation context
 * (e.g., chart API, pane index)
 */

/**
 * LWC options shape after translation from internal options.
 *
 * Replaces our internal `name` field with LWC's `title` field.
 */

/**
 * Union of all LWC series options types.
 */

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

/**
 * Helper alias for working with heterogeneous adapter collections (e.g., registries).
 */

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

/**
 * TOpts shape for SeriesAdapterWithDescriptor.
 *
 * Uses TOpts pattern (complete specification) with optional `updateDatum` that defaults to `datum` when not specified.
 * This eliminates the common duplication where backfill and update use the same datum type.
 */

/**
 * Union-friendly alias for a series API bound to any supported LWC series type.
 */

/**
 * Args for applying incremental updates to a series.
 *
 * TExternal: the external LWC series type literal (e.g., 'Area') TDatum: the adapter-specific datum type for an update
 */

/**
 * Resolves the create context type from TOpts.
 *
 * If `createContext` is specified in TOpts, uses that; otherwise falls back to CreateSeriesArgsContext.
 */

/**
 * Resolves the update datum type from TOpts.
 *
 * If `updateDatum` is specified in TOpts, uses that; otherwise falls back to `datum`.
 */

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
function translateOptionsToLwc(options) {
  if (!options) return {};
  const {
    name,
    ...rest
  } = options;
  return {
    ...rest,
    title: name
  };
}

export { translateOptionsToLwc };
//# sourceMappingURL=_adapter.js.map
