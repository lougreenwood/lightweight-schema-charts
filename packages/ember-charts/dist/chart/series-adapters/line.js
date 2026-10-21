import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortNumberPointsAscending, numberPointToLwc, mapNumberSetToLwcArray } from './_lib/_lwc-converters.js';
import { getSeriesColors } from '../theme/chart-theme.js';
import { LineSeries } from 'lightweight-charts';

/**
 * Line series adapter: create/backfill/update for numeric line panes.
 */
const lineAdapter = {
  id: 'line',
  seriesType: 'Line',
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
    const lwcData = mapNumberSetToLwcArray(data);
    seriesApi.setData(lwcData);
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Use theme line color as default if no color specified
    const {
      lineColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(LineSeries, {
      color: lineColor,
      ...translateOptionsToLwc(options) // Allow options to override default
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

export { lineAdapter };
//# sourceMappingURL=line.js.map
