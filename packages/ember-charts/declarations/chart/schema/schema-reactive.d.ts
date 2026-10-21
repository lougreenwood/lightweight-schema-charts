/**
 * ReactiveChartSchema
 *
 * Reactive replacement for the imperative ChartSchema. Layout is derived from data provider/presenter membership rather
 * than maintained via manual add/remove calls. Stale state is structurally impossible because everything derives from
 * live data.
 *
 * Three levels of layout:
 *
 * 1. Layout Fragments — Provider-level, anonymous (from provider.defaultLayout)
 * 2. Default Layout — Schema-assembled from fragments, tagged with stableLayoutKey
 * 3. Actual Layout — User-modified (toggles, reorder), owned by ChartLayout class
 *
 * The reactive schema does NOT touch chart DOM. It produces layout state that the adapter (Layer 3) reads and syncs to
 * LWC APIs.
 *
 * The schema does NOT own domain-specific data (market data samples, tradable asset pair names, timeframe labels).
 * Those concerns belong upstream on the component or interactions layer. The schema receives a `getDataProviders`
 * callback and derives everything from the returned provider set.
 */
import type { DataProviderLike } from '../data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { DataStreamPresenterLike } from '../data-stream-presenters/_lib/data-stream-presenter-like';
import type { DataStreamPresenterFactory } from '../data-stream-presenters/_lib/data-stream-presenter-registry/types';
import type { ChartLayoutOverlaySnapshot, ChartState, SeriesIdentifier, SeriesPath } from './types';
import { ChartLayout, type ChartLayoutToggleSeriesError } from './chart-layout';
import { type ChartSchemaPresenterNotFoundError } from './errors';
import { type Result } from 'true-myth/result';
export declare class ReactiveChartSchema {
    #private;
    /**
     * Reactive getter: flat map of all data streams to their owning providers.
     *
     * Reactivity source: `#getDataProviders()` reads tracked args (e.g., `this.args.marketDataDataStream`,
     * `this.args.indicatorProviders`). When provider instances change (timeframe change → new TPS → new providers), Ember
     * autotracking invalidates this getter.
     *
     * Key: DataStreamIdentifier (globally unique — contains dataProviderIdentifier + stream id/type) Value: Owning
     * DataProviderLike instance
     */
    get dataProviderMap(): ReadonlyMap<DataStreamIdentifier, DataProviderLike>;
    /**
     * Full set of data providers, including those with no streams (e.g., empty indicator providers).
     *
     * Consumers that need the complete provider inventory (such as the series selector) use this getter. Stream-centric
     * consumers should use `dataProviderMap` or `presenters` instead.
     */
    get dataProviders(): ReadonlySet<DataProviderLike>;
    /**
     * The ChartLayout instance (Level 3 — actual layout with user modifications).
     *
     * Exposes the layout class so callers can access the mutation API (e.g., `toggleSeries`). The schema itself reads
     * `this.#chartLayout.layout` reactively for the enriched tree derivation.
     */
    get layout(): ChartLayout;
    /**
     * Reactive getter: resolve presenters for all active streams.
     *
     * Returns the same public surface as v1's `presenters` getter (ReadonlyMap<streamKey, DataStreamPresenterLike>).
     * Reactivity flows from dataProviderMap → inline presenter creation.
     */
    get presenters(): ReadonlyMap<string, DataStreamPresenterLike<DataProviderLike, DataStreamIdentifier>>;
    /**
     * Reactive getter: derive selected series from the current layout.
     *
     * Returns Map<streamKey, Map<SeriesPath, true>> — same public surface as v1's `selectedSeries`.
     */
    get selectedSeries(): Map<string, Map<SeriesPath, true>>;
    /**
     * Enriched tree: crosses the provider inventory with the layout overlay to produce a fully-resolved, read-only
     * snapshot for the chart adapter (Layer 3).
     *
     * Reactivity sources: `dataProviderMap` (tracked via getDataProviders callback) and `#chartLayout.layout` (@tracked).
     *
     * Walks the layout — the layout is the source of truth for what is shown and how it's arranged. For each layout
     * group, looks up the matching provider/stream from a membership lookup to enrich it. Layout entries with no matching
     * membership entry are inert (provider disappeared) and skipped.
     *
     * Indicator-specific data state (projectionId, dataHash) is derived via type guard narrowing on the provider.
     */
    get state(): ChartState;
    constructor({ dataStreamPresenterRegistry, getDataProviders, initialLayoutOverlay, }: {
        dataStreamPresenterRegistry: DataStreamPresenterFactory;
        initialLayoutOverlay?: ChartLayoutOverlaySnapshot;
        getDataProviders: () => ReadonlySet<DataProviderLike>;
    });
    /**
     * Look up a presenter by its data stream identifier.
     *
     * Walks dataProviderMap to find the matching provider, creates the presenter inline. Same public surface as v1
     * ChartSchema.getPresenterForStream.
     */
    getPresenterForStream({ dataStreamIdentifier, }: {
        dataStreamIdentifier: DataStreamIdentifier;
    }): Result<DataStreamPresenterLike<DataProviderLike, DataStreamIdentifier>, ChartSchemaPresenterNotFoundError>;
    /**
     * Toggle visibility of a specific series field. Delegates to ChartLayout.
     *
     * Returns Result — the layout mutation triggers Ember tracking, which recomputes `state` downstream.
     */
    toggleSeries({ identifier, }: {
        identifier: SeriesIdentifier<DataStreamIdentifier>;
    }): Result<true, ChartLayoutToggleSeriesError>;
}
//# sourceMappingURL=schema-reactive.d.ts.map