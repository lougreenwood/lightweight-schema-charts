import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortOhlcPointsAscending, ohlcPointToLwc, mapOhlcSetToCandles } from './_lib/_lwc-converters.js';
import { BarSeries } from 'lightweight-charts';

/**
 * Bar series adapter: create/backfill/update for OHLC panes rendered as bars.
 */
const barAdapter = {
  id: 'bar',
  seriesType: 'Bar',
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
    // Reuse OHLC mapping; BarData has the same structural shape (time, open, high, low, close).
    seriesApi.setData(mapOhlcSetToCandles(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    const seriesApi = chart.addSeries(BarSeries, translateOptionsToLwc(options), paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortOhlcPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(ohlcPointToLwc(point)));
  }
};

export { barAdapter };
//# sourceMappingURL=bar.js.map
