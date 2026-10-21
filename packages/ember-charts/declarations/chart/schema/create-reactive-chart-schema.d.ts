import type { DataStreamPresenterFactory } from '../data-stream-presenters/_lib/data-stream-presenter-registry/types';
import type { DataProviderLike } from '../data-providers/_lib/data-provider-like';
import type { ChartLayoutOverlaySnapshot } from './types';
import { ReactiveChartSchema } from './schema-reactive';
/**
 * Create the chart schema from consumer-supplied providers and presenters.
 *
 * The package never reads an application model. A consumer supplies its provider instances, a presenter factory that
 * understands its provider types, and an optional persisted layout overlay.
 */
export declare function createReactiveChartSchema({ getDataProviders, presenterFactory, initialLayoutOverlay, }: {
    getDataProviders: () => ReadonlySet<DataProviderLike>;
    presenterFactory: DataStreamPresenterFactory;
    initialLayoutOverlay?: ChartLayoutOverlaySnapshot;
}): ReactiveChartSchema;
//# sourceMappingURL=create-reactive-chart-schema.d.ts.map