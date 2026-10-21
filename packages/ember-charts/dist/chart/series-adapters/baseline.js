import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortNumberPointsAscending, numberPointToLwc, mapNumberSetToLwcArray } from './_lib/_lwc-converters.js';
import { BaselineSeries } from 'lightweight-charts';

/**
 * Baseline series adapter: create/backfill/update for numeric panes.
 */
const baselineAdapter = {
  id: 'baseline',
  seriesType: 'Baseline',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    const seriesApi = chart.addSeries(BaselineSeries, translateOptionsToLwc(options), paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortNumberPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(numberPointToLwc(point)));
  }
};

export { baselineAdapter };
//# sourceMappingURL=baseline.js.map
