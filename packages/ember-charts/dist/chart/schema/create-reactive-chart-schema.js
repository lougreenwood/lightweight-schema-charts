import { ReactiveChartSchema } from './schema-reactive.js';

/**
 * Create the chart schema from consumer-supplied providers and presenters.
 *
 * The package never reads an application model. A consumer supplies its provider instances, a presenter factory that
 * understands its provider types, and an optional persisted layout overlay.
 */
function createReactiveChartSchema({
  getDataProviders,
  presenterFactory,
  initialLayoutOverlay
}) {
  return new ReactiveChartSchema({
    dataStreamPresenterRegistry: presenterFactory,
    getDataProviders,
    initialLayoutOverlay
  });
}

export { createReactiveChartSchema };
//# sourceMappingURL=create-reactive-chart-schema.js.map
