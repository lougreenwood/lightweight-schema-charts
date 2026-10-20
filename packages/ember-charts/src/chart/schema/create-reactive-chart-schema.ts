import type { DataStreamPresenterFactory } from '#src/chart/data-stream-presenters/_lib/data-stream-presenter-registry/types';
import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type { ChartLayoutOverlaySnapshot } from '#src/chart/schema/types';

import { ReactiveChartSchema } from '#src/chart/schema/schema-reactive';

/**
 * Create the chart schema from consumer-supplied providers and presenters.
 *
 * The package never reads an application model. A consumer supplies its provider instances, a presenter factory that
 * understands its provider types, and an optional persisted layout overlay.
 */
export function createReactiveChartSchema({
  getDataProviders,
  presenterFactory,
  initialLayoutOverlay,
}: {
  getDataProviders: () => ReadonlySet<DataProviderLike>;
  presenterFactory: DataStreamPresenterFactory;
  initialLayoutOverlay?: ChartLayoutOverlaySnapshot;
}): ReactiveChartSchema {
  return new ReactiveChartSchema({
    dataStreamPresenterRegistry: presenterFactory,
    getDataProviders,
    initialLayoutOverlay,
  });
}
