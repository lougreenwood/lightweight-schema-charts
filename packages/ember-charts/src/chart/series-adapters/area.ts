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
  AreaSeries,
  type DeepPartial,
  type LineWidth,
} from 'lightweight-charts';

export type AreaPoint = ChartTimeSeriesPointNumber;

export type AreaSeriesDescriptor = {
  dataKey?: string;
  key?: string;
  options?: AreaSeriesOptions;
  type: 'area';
};

export type AreaSeriesOptions = {
  bottomColor?: string;
  lineColor?: string;
  lineWidth?: DeepPartial<LineWidth>;
  name?: string;
  priceScaleId?: string;
  topColor?: string;
};

/**
 * Area series adapter: create/backfill/update for numeric area panes.
 */
export const areaAdapter: SeriesAdapterWithDescriptor<{
  datum: AreaPoint;
  descriptor: AreaSeriesDescriptor;
  external: 'Area';
  internal: 'area';
  options: AreaSeriesOptions;
}> = {
  id: 'area',

  seriesType: 'Area',

  applyOptions({ options, seriesApi }) {
    if (options) {
      seriesApi.applyOptions(translateOptionsToLwc(options));
    }
  },

  backfillSeries({ data, seriesApi }) {
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },

  createSeries({ context: { chart, paneIndex }, options }) {
    // Use theme colors as defaults for area series
    const { lineColor } = getSeriesColors();
    const seriesApi = chart.addSeries(
      AreaSeries,
      {
        lineColor,
        topColor: `${lineColor}80`, // 50% opacity
        bottomColor: `${lineColor}10`, // 6% opacity
        ...translateOptionsToLwc(options), // Allow options to override defaults
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
