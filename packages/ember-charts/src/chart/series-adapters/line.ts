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
import { getSeriesColors } from '#src/chart/theme/chart-theme';
import {
  type DeepPartial,
  LineSeries,
  type LineWidth,
} from 'lightweight-charts';

export type LinePoint = ChartTimeSeriesPointNumber;

export type LineSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: LineSeriesOptions;
  type: 'line';
};

export type LineSeriesOptions = {
  color?: string;
  lineWidth?: DeepPartial<LineWidth>;
  name?: string;
  priceScaleId?: string;
};

/**
 * Line series adapter: create/backfill/update for numeric line panes.
 */
export const lineAdapter: SeriesAdapterWithDescriptor<{
  datum: LinePoint;
  descriptor: LineSeriesDescriptor;
  external: 'Line';
  internal: 'line';
  options: LineSeriesOptions;
}> = {
  id: 'line',

  seriesType: 'Line',

  applyOptions({ options, seriesApi }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },

  backfillSeries({ data, seriesApi }) {
    const lwcData = mapNumberSetToLwcArray(data);
    seriesApi.setData(lwcData);
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    // Use theme line color as default if no color specified
    const { lineColor } = getSeriesColors();
    const seriesApi = chart.addSeries(
      LineSeries,
      {
        color: lineColor,
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
