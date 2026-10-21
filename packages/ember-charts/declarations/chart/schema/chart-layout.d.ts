/**
 * ChartLayout
 *
 * Two-layer composition for chart layout state:
 *
 * Layer A — Derived Default (stateless, reactive): A `@cached` getter recomputed from the current providers'
 * `defaultLayout` fragments via a callback from the schema. New providers automatically appear because the callback
 * reads tracked provider state.
 *
 * Layer B — Persisted Overlay (stateful, user-modified): Stores ONLY entries where the user has changed something from
 * the default. Initially empty. Keyed by `groupId::fieldPath`.
 *
 * The public `.layout` getter merges both layers: overlay wins, stale overlay entries (no matching default) are
 * skipped.
 *
 * Reactivity: `#overlay` is @tracked. The `getDefaultLayout` callback reads tracked provider state upstream. Both
 * invalidation paths cause the merged `.layout` to recompute.
 */
import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { ChartLayoutData, ChartLayoutOverlaySnapshot, GroupId, SeriesIdentifier, SeriesPath } from './types';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error';
import { type Result } from 'true-myth/result';
/**
 * Error when toggleSeries finds a matching series group but no series entry matches the requested fieldPath.
 */
export type ChartLayoutFieldNotFoundError = NotFoundError<{
    errorCode: 'CHART_LAYOUT_FIELD_NOT_FOUND';
    message: string;
    meta: {
        fieldPath: SeriesPath;
        groupId: GroupId;
    };
}>;
/**
 * Error when toggleSeries cannot resolve a stableLayoutKey for the given DataStreamIdentifier.
 *
 * This means the provider is not in the registry — the toggle target is unknown.
 */
export type ChartLayoutProviderNotFoundError = NotFoundError<{
    errorCode: 'CHART_LAYOUT_PROVIDER_NOT_FOUND';
    message: string;
    meta: {
        dataStreamIdentifier: DataStreamIdentifier;
    };
}>;
export type ChartLayoutToggleSeriesError = ChartLayoutFieldNotFoundError | ChartLayoutProviderNotFoundError;
/**
 * Callback that returns the current derived default layout. Provided by the schema — reads tracked provider state so
 * the `@cached` layout getter recomputes when providers change.
 */
export type GetDefaultLayoutFn = () => ChartLayoutData;
/**
 * Function that resolves a DataStreamIdentifier to its canonical layout group identity. Injected by the schema so the
 * layout does not need direct access to the provider registry or membership rules.
 */
export type ResolveGroupIdFn = (args: {
    dataStreamIdentifier: DataStreamIdentifier;
}) => GroupId | undefined;
export declare class ChartLayout {
    #private;
    /**
     * Merged layout: derived default + persisted overlay.
     *
     * Walks the derived default layout. For each series entry, checks the overlay — if an override exists, uses the
     * overlay's visibility; otherwise uses the default. Stale overlay entries (provider removed) are naturally skipped
     * because we iterate the default, not the overlay.
     */
    get layout(): ChartLayoutData;
    get overlay(): ChartLayoutOverlaySnapshot;
    constructor({ getDefaultLayout, initialOverlay, resolveGroupId, }: {
        getDefaultLayout: GetDefaultLayoutFn;
        initialOverlay?: ChartLayoutOverlaySnapshot;
        resolveGroupId: ResolveGroupIdFn;
    });
    replaceOverlay({ overlay }: {
        overlay: ChartLayoutOverlaySnapshot;
    }): void;
    /**
     * Toggle visibility of a specific series field.
     *
     * Resolves groupId from the dataStreamIdentifier via the injected resolver, verifies the field exists in the current
     * derived default layout, then promotes the toggled value into the overlay. If the resulting visibility matches the
     * default, the overlay entry is removed (cleanup).
     */
    toggleSeries({ identifier: { dataStreamIdentifier, fieldPath }, }: {
        identifier: SeriesIdentifier<DataStreamIdentifier>;
    }): Result<true, ChartLayoutToggleSeriesError>;
    private _overlay;
}
//# sourceMappingURL=chart-layout.d.ts.map