import type {
  ChartState,
  DataProviderLike,
  DataStreamPresenterFactory,
  DataStreamPresenterLike,
} from '@lightweight-schema-charts/ember';
import {
  SeriesAdapterRegistry,
  createReactiveChartSchema,
} from '@lightweight-schema-charts/ember';
import { ok } from 'true-myth/result';

const providerIdentifier = {
  id: 'synthetic',
  type: 'synthetic-market',
} as const;
const streamIdentifier = {
  dataProviderIdentifier: providerIdentifier,
  id: 'close',
  type: 'candlestick',
} as const;

export interface SyntheticCandle {
  close: number;
  high: number;
  low: number;
  open: number;
  time: Date;
}

export function candles(count: number): SyntheticCandle[] {
  return Array.from({ length: count }, (_, index) => {
    const base = 100 + index;
    return {
      close: base + 1,
      high: base + 2,
      low: base - 2,
      open: base,
      time: new Date(Date.UTC(2024, 0, 1, 0, index)),
    };
  });
}

function sample(candle: SyntheticCandle) {
  return {
    data: candle,
    dataProviderIdentifier: providerIdentifier,
    dataStreamIdentifier: streamIdentifier,
    meta: {},
    time: candle.time,
    window: { end: candle.time.getTime(), start: candle.time.getTime() },
  };
}

export function createSyntheticChart({ candleCount }: { candleCount: number }) {
  const data = candles(candleCount);
  const lastTime = data.at(-1)?.time.getTime() ?? 0;

  const provider = {
    dataStreamIdentifiers: new Set([streamIdentifier]),
    defaultLayout: {
      panes: [
        {
          seriesGroups: [
            {
              groupId: 'synthetic::candlestick',
              series: [],
              stableLayoutKey: 'synthetic',
              streamType: 'candlestick',
            },
          ],
        },
      ],
    },
    getCursor: () => ok({ time: lastTime }),
    getDataSince: ({ cursor }: { cursor?: { time: number } }) => {
      const since = cursor?.time ?? 0;
      const fresh = data.filter((candle) => candle.time.getTime() > since);
      return ok({
        dataStreamIdentifier: streamIdentifier,
        newCursor: { time: lastTime },
        updates: new Set(
          fresh.map((candle) => ({
            data: sample(candle),
            kind: 'append' as const,
          }))
        ),
      });
    },
    getDataState: () => ({
      cursor: { time: lastTime },
      dataHash: undefined,
      dataLength: data.length,
      projectionId: undefined,
    }),
    groupIdFor: () => 'synthetic::candlestick',
    identifier: providerIdentifier,
    name: 'Synthetic',
    stableLayoutKey: 'synthetic',
  } as unknown as DataProviderLike;

  const descriptor = {
    identifier: { fieldPath: 'close' },
    kind: 'series',
    seriesKind: 'candlestick',
  };

  const presenter = {
    dataProvider: provider,
    dataStreamIdentifier: streamIdentifier,
    defaultLayout: provider.defaultLayout,
    defaultSeries: new Set(['close']),
    describeFields: () => new Set([descriptor]),
    structuralDescriptors: new Set([descriptor]),
    name: 'Synthetic',
    projectField: ({ dataSamples }: { dataSamples: Iterable<unknown> }) =>
      new Set(
        Array.from(dataSamples).map((entry) => {
          const candidate = entry as {
            data?: SyntheticCandle;
          } & Partial<SyntheticCandle>;
          const candle = candidate.data ?? (candidate as SyntheticCandle);
          return {
            time: candle.time,
            value: {
              close: candle.close,
              high: candle.high,
              low: candle.low,
              open: candle.open,
            },
          };
        })
      ),
    providerName: 'Synthetic',
    streamName: 'Synthetic close',
  } as unknown as DataStreamPresenterLike;

  const presenterFactory: DataStreamPresenterFactory = {
    makeDataStreamPresenter: () => presenter,
  };

  const schema = createReactiveChartSchema({
    getDataProviders: () => new Set([provider]),
    presenterFactory,
  });

  return {
    domainContext: {
      marketDataDataSampleCount: data.length,
      timeframeLabel: '1m',
      tradableAssetPairName: 'SYNTH/USD',
    },
    registry: new SeriesAdapterRegistry(),
    state: schema.state as ChartState,
  };
}
