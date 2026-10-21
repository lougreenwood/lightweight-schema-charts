import { translateOptionsToLwc } from './_lib/_adapter.js';
import { sortOhlcPointsAscending, ohlcPointToLwc, mapOhlcSetToCandles } from './_lib/_lwc-converters.js';
import { getCandlestickColors } from '../theme/chart-theme.js';
import { CandlestickSeries } from 'lightweight-charts';

/**
 * Candlestick series adapter: create/backfill/update for OHLC panes.
 */
const candlestickAdapter = {
  id: 'candlestick',
  seriesType: 'Candlestick',
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
    seriesApi.setData(mapOhlcSetToCandles(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Apply theme colors for candlesticks
    const themeColors = getCandlestickColors();
    const seriesApi = chart.addSeries(CandlestickSeries, {
      ...themeColors,
      ...translateOptionsToLwc(options)
    }, paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    const sortedPoints = sortOhlcPointsAscending({
      points: data
    });
    sortedPoints.forEach(point => seriesApi.update(ohlcPointToLwc(point)));
  }
};

export { candlestickAdapter };
//# sourceMappingURL=candle-stick.js.map
