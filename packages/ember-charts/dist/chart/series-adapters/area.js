import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortNumberPointsAscending, numberPointToLwc, mapNumberSetToLwcArray } from './_lib/_lwc-converters.js';
import { getSeriesColors } from '../theme/chart-theme.js';
import { AreaSeries } from 'lightweight-charts';

/**
 * Area series adapter: create/backfill/update for numeric area panes.
 */
const areaAdapter = {
  id: 'area',
  seriesType: 'Area',
  applyOptions({
    options,
    seriesApi
  }) {
    if (options) {
      seriesApi.applyOptions(translateOptionsToLwc(options));
    }
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
    // Use theme colors as defaults for area series
    const {
      lineColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: `${lineColor}80`,
      // 50% opacity
      bottomColor: `${lineColor}10`,
      // 6% opacity
      ...translateOptionsToLwc(options) // Allow options to override defaults
    }, paneIndex);
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

export { areaAdapter };
//# sourceMappingURL=area.js.map
