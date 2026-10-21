/**
 * ChartLwcAdapter Modifier
 *
 * Layer 3 of the reactive chart architecture. Owns all LWC DOM operations for the reactive chart schema. Reads
 * `schema.state` (enriched tree) reactively and reconciles LWC DOM state against it.
 *
 * Change detection is delegated to the pure `diffGroupStates` function which compares a Map<GroupId, GroupSnapshot>
 * (captured after each reconciliation) against the current enriched groups. The adapter only stores LWC DOM handles
 * (#paneStates) and previous snapshots (#previousSnapshots) — no parallel cached state.
 *
 * Reconciliation strategy (two-phase):
 *
 * Phase 1 — Structural:
 *
 * - Groups marked 'added' → find correct pane, create pane if needed, build series with full backfill
 * - Groups marked 'removed' → tear down series, remove from pane, remove pane if empty
 *
 * Phase 2 — Data (for existing groups):
 *
 * - DataChange: 'rebuilt' → tear down + recreate series with full backfill
 * - DataChange: 'updated' → fetch since previous cursor, updateSeries (LWC upsert-by-timestamp)
 * - NamesChanged (when no structural/rebuilt) → update labels via applyOptions
 *
 * Usage:
 *
 * ```hbs
 * <div {{chartLwcAdapter this.reactiveSchema this.seriesAdapterRegistry this.domainContext}}></div>
 * ```
 */
import type { ChartDomainContext } from './chart-lwc-adapter/types';
import type { ChartState } from '../schema/types';
import type { SeriesAdapterRegistry } from '../series-adapters/_lib/_registry';
import type { SeriesValueFailure } from '../series-adapters/_lib/value-handler/types';
import type { IChartApi } from 'lightweight-charts';
import Modifier from 'ember-modifier';
interface ChartLwcAdapterModifierSignature {
    Args: {
        Named: {
            onError?: (failure: SeriesValueFailure) => void;
            /**
             * Optional callback invoked once after the LWC chart instance is created. Receives an `applyTheme` function that
             * re-reads the current chart theme and re-applies it. Used by CanvasThemeModifier to react to OS/user theme
             * changes without coupling theme observation into this adapter.
             */
            onReady?: (args: {
                applyTheme: () => void;
                chart: IChartApi;
            }) => void;
        };
        Positional: [
            state: ChartState,
            seriesAdapterRegistry: SeriesAdapterRegistry,
            domainContext: ChartDomainContext
        ];
    };
    Element: HTMLElement;
}
export default class ChartLwcAdapterModifier extends Modifier<ChartLwcAdapterModifierSignature> {
    #private;
    /**
     * Re-reads the current chart theme and applies it to the LWC chart instance. Called by CanvasThemeModifier when the
     * document theme class changes.
     */
    applyTheme: () => void;
    modify(element: HTMLElement, [state, seriesAdapterRegistry, domainContext]: [
        ChartState,
        SeriesAdapterRegistry,
        ChartDomainContext
    ], { onReady, onError, }: {
        onReady?: (args: {
            applyTheme: () => void;
            chart: IChartApi;
        }) => void;
        onError?: (failure: SeriesValueFailure) => void;
    }): void;
}
export {};
//# sourceMappingURL=chart-lwc-adapter.d.ts.map