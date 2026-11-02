import {
  SeriesAdapterRegistry,
  adapters,
  createReactiveChartSchema,
} from '@lightweight-schema-charts/ember';
import type {
  ChartState,
  DataStreamPresenterFactory,
  SeriesType,
} from '@lightweight-schema-charts/ember';
import {
  SyntheticPresenter,
  syntheticValueHandler,
} from 'test-app/synthetic/synthetic-presenter';
import {
  SyntheticCandle,
  SyntheticProvider,
} from 'test-app/synthetic/synthetic-provider';

export const chartLifecycle = { createdCount: 0, removeCount: 0 };

export function resetChartLifecycle(): void {
  chartLifecycle.createdCount = 0;
  chartLifecycle.removeCount = 0;
}

export class CountingSeriesAdapterRegistry extends SeriesAdapterRegistry {
  lookupCount = 0;

  override getAdapterByType(
    type: SeriesType
  ): ReturnType<SeriesAdapterRegistry['getAdapterByType']> {
    this.lookupCount += 1;
    return super.getAdapterByType(type);
  }
}

export function createSyntheticChart({
  candleCount,
  handlerId = 'wrapped-candle',
  includeScalar = false,
  missingAdapters = [],
}: {
  candleCount: number;
  handlerId?: string;
  includeScalar?: boolean;
  missingAdapters?: ReadonlyArray<SeriesType>;
}) {
  const provider = new SyntheticProvider({
    candles: Array.from(
      { length: candleCount },
      (_, index) => new SyntheticCandle({ index })
    ),
    projectionId: handlerId,
  });
  const presenter = new SyntheticPresenter({
    dataProvider: provider,
    handlerId,
    includeScalar,
  });
  const presenterFactory: DataStreamPresenterFactory = {
    makeDataStreamPresenter: () => presenter,
  };
  const schema = createReactiveChartSchema({
    getDataProviders: () => new Set([provider]),
    presenterFactory,
  });

  return {
    provider,
    presenter,
    schema,
    append: () => provider.append(),
    get domainContext() {
      return {
        marketDataDataSampleCount: provider.dataSource.length,
        timeframeLabel: '1m',
        tradableAssetPairName: 'SYNTH/USD',
      };
    },
    registry: new CountingSeriesAdapterRegistry({
      items: adapters.filter(({ id }) => !missingAdapters.includes(id)),
      valueHandlers: [syntheticValueHandler],
    }),
    get state(): ChartState {
      return schema.state;
    },
  };
}
