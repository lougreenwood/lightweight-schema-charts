import type { TestContext } from '@ember/test-helpers';
import type { htmlSafe } from '@ember/template';
import type {
  ChartDomainContext,
  ChartRenderFailure,
  ChartState,
  SeriesAdapterRegistry,
} from '@lightweight-schema-charts/ember';
import type { IChartApi } from 'lightweight-charts';
import type { createSyntheticChart } from 'test-app/synthetic/synthetic-chart';

export interface ChartTestContext extends TestContext {
  model: ReturnType<typeof createSyntheticChart>;
  state: ChartState;
  registry: SeriesAdapterRegistry;
  domainContext: ChartDomainContext;
  api: IChartApi | undefined;
  failures: ChartRenderFailure[];
  hostStyle: ReturnType<typeof htmlSafe>;
  focusRanges: Array<{ from: number; to: number }>;
  captureReady: (args: { chart: IChartApi; applyTheme: () => void }) => void;
  captureFailure: (failure: ChartRenderFailure) => void;
}
