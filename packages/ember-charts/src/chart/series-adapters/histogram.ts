import type {
  ChartTimeSeriesPointNumber,
  SeriesAdapterWithDescriptor,
} from './_lib/_adapter';

import { translateOptionsToLwc } from './_lib/_adapter';
import {
  mapNumberSetToLwcArray,
  numberPointToLwc,
  sortNumberPointsAscending,
} from './_lib/_lwc-converters';
import { getSeriesColors } from '../theme/chart-theme';
import { HistogramSeries } from 'lightweight-charts';

export type HistogramPoint = ChartTimeSeriesPointNumber;

export type HistogramSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: HistogramSeriesOptions;
  type: 'histogram';
};

export type HistogramSeriesOptions = {
  color?: string; // default bar color; per-point color should be set on data when needed
  name?: string;
  priceScaleId?: string;
};

/**
 * Conversion handled by adapter-side helpers in _lwc-converters.ts
 */

/**
 * Histogram series adapter: create/backfill/update for numeric histogram panes (e.g., Volume, MACD hist).
 */
export const histogramAdapter: SeriesAdapterWithDescriptor<{
  datum: HistogramPoint;
  descriptor: HistogramSeriesDescriptor;
  external: 'Histogram';
  internal: 'histogram';
  options: HistogramSeriesOptions;
}> = {
  id: 'histogram',

  seriesType: 'Histogram',

  applyOptions({ options, seriesApi }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },

  backfillSeries({ data, seriesApi }) {
    // Convert Set -> Array at the boundary for LWC
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    // Use theme volume color as default if no color specified
    const { volumeColor } = getSeriesColors();
    const seriesApi = chart.addSeries(
      HistogramSeries,
      {
        color: volumeColor,
        ...translateOptionsToLwc(options), // Allow options to override default
      },
      paneIndex,
    );

    return {
      seriesApi,
    };
  },

  updateSeries({ data, seriesApi }) {
    sortNumberPointsAscending({ points: data }).forEach((point) =>
      seriesApi.update(numberPointToLwc(point)),
    );
  },
};
