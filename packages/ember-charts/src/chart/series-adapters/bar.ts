import type {
  ChartTimeSeriesPointOhlc,
  SeriesAdapterWithDescriptor,
} from '#src/chart/series-adapters/_lib/_adapter';

import { translateOptionsToLwc } from '#src/chart/series-adapters/_lib/_adapter';
import {
  mapOhlcSetToCandles,
  ohlcPointToLwc,
  sortOhlcPointsAscending,
} from '#src/chart/series-adapters/_lib/_lwc-converters';
import { BarSeries } from 'lightweight-charts';

export type BarPoint = ChartTimeSeriesPointOhlc;

export type BarSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: BarSeriesOptions;
  type: 'bar';
};

export type BarSeriesOptions = {
  name?: string;
  priceScaleId?: string;
};

/**
 * Bar series adapter: create/backfill/update for OHLC panes rendered as bars.
 */
export const barAdapter: SeriesAdapterWithDescriptor<{
  datum: BarPoint;
  descriptor: BarSeriesDescriptor;
  external: 'Bar';
  internal: 'bar';
  options: BarSeriesOptions;
}> = {
  id: 'bar',

  seriesType: 'Bar',

  applyOptions({ options, seriesApi }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },

  backfillSeries({ data, seriesApi }) {
    // Reuse OHLC mapping; BarData has the same structural shape (time, open, high, low, close).
    seriesApi.setData(mapOhlcSetToCandles(data));
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    const seriesApi = chart.addSeries(
      BarSeries,
      translateOptionsToLwc(options),
      paneIndex,
    );

    return {
      seriesApi,
    };
  },

  updateSeries({ data, seriesApi }) {
    sortOhlcPointsAscending({ points: data }).forEach((point) =>
      seriesApi.update(ohlcPointToLwc(point)),
    );
  },
};
