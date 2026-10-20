import type {
  ChartTimeSeriesPointNumber,
  SeriesAdapterWithDescriptor,
} from '#src/chart/series-adapters/_lib/_adapter';

import { translateOptionsToLwc } from '#src/chart/series-adapters/_lib/_adapter';
import {
  mapNumberSetToLwcArray,
  numberPointToLwc,
  sortNumberPointsAscending,
} from '#src/chart/series-adapters/_lib/_lwc-converters';
import { BaselineSeries } from 'lightweight-charts';

export type BaselinePoint = ChartTimeSeriesPointNumber;

export type BaselineSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: BaselineSeriesOptions;
  type: 'baseline';
};

export type BaselineSeriesOptions = {
  name?: string;
  priceScaleId?: string;
};

/**
 * Baseline series adapter: create/backfill/update for numeric panes.
 */
export const baselineAdapter: SeriesAdapterWithDescriptor<{
  datum: BaselinePoint;
  descriptor: BaselineSeriesDescriptor;
  external: 'Baseline';
  internal: 'baseline';
  options: BaselineSeriesOptions;
}> = {
  id: 'baseline',

  seriesType: 'Baseline',

  applyOptions({ options, seriesApi }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },

  backfillSeries({ data, seriesApi }) {
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    const seriesApi = chart.addSeries(
      BaselineSeries,
      translateOptionsToLwc(options),
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
