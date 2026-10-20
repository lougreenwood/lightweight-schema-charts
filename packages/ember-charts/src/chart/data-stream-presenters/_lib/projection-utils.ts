/**
 * ProjectionUtils
 *
 * Reusable projection utilities for common data transformations. These helpers provide type-safe, consistent methods
 * for extracting and formatting data from samples into adapter-ready formats.
 *
 * Key principles:
 *
 * - Static methods only (no state)
 * - Type-safe extraction with proper typing
 * - Handle common patterns (numeric extraction, currency formatting, OHLC structures)
 */

import type { BaseChartDataSample } from '#src/chart/data-providers/_lib/data-stream/types';
import type { SeriesPath } from '#src/chart/schema/types';
import type { AreaPoint } from '#src/chart/series-adapters/area';
import type { BaselinePoint } from '#src/chart/series-adapters/baseline';
import type { CandleStickPoint } from '#src/chart/series-adapters/candle-stick';
import type { HistogramPoint } from '#src/chart/series-adapters/histogram';
import type { LinePoint } from '#src/chart/series-adapters/line';

import CurrencyValue from '#src/vendor/shared-utils/currency-value';

/**
 * ProjectionUtils
 *
 * Collection of static helper methods for projecting data from samples.
 */
export class ProjectionUtils {
  /**
   * Projects area data from samples.
   *
   * Similar to line/histogram but for area series type.
   */
  static area(args: {
    fieldPath: SeriesPath;
    samples: ReadonlySet<BaseChartDataSample>;
  }): ReadonlySet<AreaPoint> {
    return args.samples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(sample, args.fieldPath);
      const projected: AreaPoint = {
        time: sample.time,
        value: Number(value),
      };
      return accumulated.add(projected);
    }, new Set<AreaPoint>());
  }

  /**
   * Projects baseline data from samples.
   *
   * Expects samples with structure containing a value and optional topFillColor properties.
   */
  static baseline(args: {
    fieldPath: SeriesPath;
    samples: ReadonlySet<BaseChartDataSample>;
  }): ReadonlySet<BaselinePoint> {
    return args.samples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(sample, args.fieldPath);
      const projected: BaselinePoint = {
        time: sample.time,
        value: Number(value),
      };
      return accumulated.add(projected);
    }, new Set<BaselinePoint>());
  }

  /**
   * Projects a boolean field as baseline points (0/1).
   *
   * Used for boolean meta fields in indicators. Projects boolean values as baseline series data with 0 for false and 1
   * for true.
   *
   * @param dataSamples - Set of chart data samples
   * @param fieldPath   - Dot-notation path to the boolean value
   */
  static booleanAsBaseline({
    dataSamples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<BaseChartDataSample>;
    fieldPath: SeriesPath;
  }): ReadonlySet<BaselinePoint> {
    return dataSamples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(sample, fieldPath);
      const projected: BaselinePoint = {
        time: sample.time,
        value: value ? 1 : 0,
      };
      return accumulated.add(projected);
    }, new Set<BaselinePoint>());
  }

  /**
   * Projects a boolean field as numeric (0/1).
   *
   * @param fieldPath - Dot-notation path to the boolean value
   */
  static booleanAsHistogram(args: {
    fieldPath: SeriesPath;
    samples: ReadonlySet<BaseChartDataSample>;
  }): ReadonlySet<HistogramPoint> {
    return args.samples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(sample, args.fieldPath);
      const projected: HistogramPoint = {
        time: sample.time,
        value: value ? 1 : 0,
      };
      return accumulated.add(projected);
    }, new Set<HistogramPoint>());
  }

  /**
   * Projects a currency value field with proper formatting.
   *
   * Similar to number but ensures proper decimal handling for currency values.
   *
   * @param fieldPath - Dot-notation path to the currency value
   */
  static currencyValue({
    dataSamples: samples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<BaseChartDataSample>;
    fieldPath: SeriesPath;
  }): ReadonlySet<LinePoint> {
    return samples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(
        sample,
        fieldPath,
      ) as CurrencyValue;
      const projected: LinePoint = {
        time: sample.time,
        value: Number(value.float.value),
      };
      return accumulated.add(projected);
    }, new Set<LinePoint>());
  }

  /**
   * Projects a numeric field from samples.
   *
   * @param fieldPath - Dot-notation path to the numeric value (e.g., 'data.trades', 'data.ema')
   */
  static number({
    dataSamples: samples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<BaseChartDataSample>;
    fieldPath: SeriesPath;
  }): ReadonlySet<LinePoint> {
    return samples.values().reduce((accumulated, sample) => {
      const value = this.#extractNestedValue(sample, fieldPath);
      const projected: LinePoint = {
        time: sample.time,
        value: Number(value),
      };
      return accumulated.add(projected);
    }, new Set<LinePoint>());
  }

  /**
   * Projects OHLC data from samples.
   *
   * Expects samples with structure: { data: { ohlc: { open, high, low, close } } }
   */
  static ohlc({
    dataSamples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<BaseChartDataSample>;
    fieldPath: SeriesPath;
  }): ReadonlySet<CandleStickPoint> {
    return dataSamples.values().reduce((accumulated, sample) => {
      const ohlcData = this.#extractNestedValue(sample, fieldPath) as {
        close: {
          quote: CurrencyValue;
          usd: CurrencyValue;
        };
        high: {
          quote: CurrencyValue;
          usd: CurrencyValue;
        };
        low: {
          quote: CurrencyValue;
          usd: CurrencyValue;
        };
        open: {
          quote: CurrencyValue;
          usd: CurrencyValue;
        };
      };
      const projected: CandleStickPoint = {
        time: sample.time,
        value: {
          close: ohlcData.close.usd,
          high: ohlcData.high.usd,
          low: ohlcData.low.usd,
          open: ohlcData.open.usd,
        },
      };
      return accumulated.add(projected);
    }, new Set<CandleStickPoint>());
  }

  /**
   * Helper: Extract nested value from object using dot-notation path.
   *
   * @param   object - Source object
   * @param   path   - Dot-notation path (e.g., 'volume.buy')
   *
   * @returns        The value at the path, or undefined if not found
   */
  static #extractNestedValue(object: object, path: SeriesPath): unknown {
    const parts = path.split('.');
    let current: unknown = object;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
