import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortNumberPointsAscending, numberPointToLwc, mapNumberSetToLwcArray } from './_lib/_lwc-converters.js';
import { getSeriesColors } from '../theme/chart-theme.js';
import { HistogramSeries } from 'lightweight-charts';

/**
 * Conversion handled by adapter-side helpers in _lwc-converters.ts
 */

/**
 * Histogram series adapter: create/backfill/update for numeric histogram panes (e.g., Volume, MACD hist).
 */
const histogramAdapter = {
  id: 'histogram',
  seriesType: 'Histogram',
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
    // Convert Set -> Array at the boundary for LWC
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Use theme volume color as default if no color specified
    const {
      volumeColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(HistogramSeries, {
      color: volumeColor,
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

export { histogramAdapter };
//# sourceMappingURL=histogram.js.map
