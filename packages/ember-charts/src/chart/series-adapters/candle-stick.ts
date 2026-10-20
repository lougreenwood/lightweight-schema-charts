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
import { getCandlestickColors } from '#src/chart/theme/chart-theme';
import { CandlestickSeries } from 'lightweight-charts';

export type CandleStickPoint = ChartTimeSeriesPointOhlc;

export type CandlestickSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: CandlestickSeriesOptions;
  type: 'candlestick';
};

export type CandlestickSeriesOptions = {
  name?: string;
  priceScaleId?: string;
};

/**
 * Candlestick series adapter: create/backfill/update for OHLC panes.
 */
export const candlestickAdapter: SeriesAdapterWithDescriptor<{
  datum: CandleStickPoint;
  descriptor: CandlestickSeriesDescriptor;
  external: 'Candlestick';
  internal: 'candlestick';
  options: CandlestickSeriesOptions;
}> = {
  id: 'candlestick',

  seriesType: 'Candlestick',

  applyOptions({ options, seriesApi }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },

  backfillSeries({ data, seriesApi }) {
    seriesApi.setData(mapOhlcSetToCandles(data));
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    // Apply theme colors for candlesticks
    const themeColors = getCandlestickColors();
    const seriesApi = chart.addSeries(
      CandlestickSeries,
      {
        ...themeColors,
        ...translateOptionsToLwc(options),
      },
      paneIndex,
    );

    return {
      seriesApi,
    };
  },

  updateSeries({ data, seriesApi }) {
    const sortedPoints = sortOhlcPointsAscending({ points: data });

    sortedPoints.forEach((point) => seriesApi.update(ohlcPointToLwc(point)));
  },
};
