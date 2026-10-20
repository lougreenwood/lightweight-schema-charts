/**
 * Sample Time Filtering
 *
 * Provides a pure utility function for filtering time-ordered samples by a date threshold. Works on any iterable of
 * samples that have a `time` property.
 */

/**
 * Type constraint for samples that have a time property.
 *
 * This is intentionally minimal to work with any time-ordered data structure.
 */
export interface TimedSample {
  readonly time: Date;
}

/**
 * Filters samples to return only those at or after the given date.
 *
 * This is a pure utility function that works on any iterable of time-ordered samples. It does NOT assume the input is
 * sorted - it performs a simple filter operation.
 *
 * @example // Filter indicator signals since a date const recentSignals = getSamplesSince({ data:
 * indicator.dataSamples, sinceDate: new Date('2024-01-01'), });
 *
 * @example // Filter tick data const recentTicks = getSamplesSince({ data: ticker.values(), sinceDate: lastUpdateTime,
 * });
 *
 * @param   args.data      - Iterable of samples with a `time` property
 * @param   args.sinceDate - Only return samples where sample.time >= sinceDate
 *
 * @returns                Array of samples at or after the given date
 */
export function getSamplesSince<TSample extends TimedSample>({
  data,
  sinceDate,
}: {
  data: Iterable<TSample>;
  sinceDate: Date;
}): TSample[] {
  const sinceTime = sinceDate.getTime();

  return [...data].filter((sample) => sample.time.getTime() >= sinceTime);
}
