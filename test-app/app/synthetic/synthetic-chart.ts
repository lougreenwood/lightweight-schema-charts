import {
  SeriesAdapterRegistry,
  createReactiveChartSchema,
} from '@lightweight-schema-charts/ember';
import type {
  ChartState,
  DataStreamPresenterFactory,
} from '@lightweight-schema-charts/ember';
import {
  SyntheticPresenter,
  syntheticValueHandler,
} from 'test-app/synthetic/synthetic-presenter';
import {
  SyntheticCandle,
  SyntheticProvider,
} from 'test-app/synthetic/synthetic-provider';

export function createSyntheticChart({
  candleCount,
  handlerId = 'wrapped-candle',
}: {
  candleCount: number;
  handlerId?: string;
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
  });
  const presenterFactory: DataStreamPresenterFactory = {
    makeDataStreamPresenter: () => presenter,
  };
  const schema = createReactiveChartSchema({
    getDataProviders: () => new Set([provider]),
    presenterFactory,
  });

  return {
    append: () => provider.append(),
    get domainContext() {
      return {
        marketDataDataSampleCount: provider.dataSource.length,
        timeframeLabel: '1m',
        tradableAssetPairName: 'SYNTH/USD',
      };
    },
    registry: new SeriesAdapterRegistry({
      valueHandlers: [syntheticValueHandler],
    }),
    get state(): ChartState {
      return schema.state;
    },
  };
}
