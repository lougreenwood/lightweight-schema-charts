import { InvariantViolationError } from '#src/vendor/shared-utils/errors/invariant-violation-error';
import parseDuration from 'parse-duration-ms';
import prettyMilliseconds from 'pretty-ms';

/**
 * Parse a human-readable duration string into milliseconds.
 *
 * This is a schema authoring utility for writing readable config defaults. It parses at schema definition time, not
 * runtime.
 *
 * @example
 *
 * ```typescript
 * // In config schema definitions:
 * const schema = {
 *   fields: [
 *     {
 *       slug: 'pollInterval',
 *       defaultValue: duration('30s'),
 *       // Instead of: defaultValue: 30_000
 *     },
 *     {
 *       slug: 'windowSizes',
 *       defaultValue: [duration('1m'), duration('5m'), duration('15m'), duration('1h')],
 *       // Instead of: defaultValue: [60_000, 300_000, 900_000, 3_600_000]
 *     },
 *   ],
 * };
 * ```
 *
 * **Supported formats:**
 *
 * - Short: "1h", "30m", "5s", "500ms"
 * - Long: "1 hour", "30 minutes", "5 seconds"
 * - Compound: "1h 30m", "1 hour 30 minutes"
 *
 * @param   input - Human-readable duration string
 *
 * @returns       Milliseconds (number)
 */
export function duration(input: string): number {
  const ms = parseDuration(input);

  if (ms === undefined) {
    InvariantViolationError.of({
      errorCode: 'DURATION_INPUT_INVALID',
      message: `Invalid duration format: "${input}"`,
      meta: { input },
    });

    return 0;
  }

  return ms;
}

/**
 * Format milliseconds as a human-readable duration string.
 *
 * This is the inverse of `duration()`. Uses `pretty-ms` internally with sensible defaults for our use cases.
 *
 * @example
 *
 * ```typescript
 * formatDuration(0); // → "0ms"
 * formatDuration(500); // → "500ms"
 * formatDuration(1000); // → "1s"
 * formatDuration(1337); // → "1s" (no decimals by default)
 * formatDuration(60000); // → "1m"
 * formatDuration(3600000); // → "1h"
 * formatDuration(5400000); // → "1h 30m"
 * formatDuration(90061000); // → "1d 1h 1m 1s"
 *
 * // Compact mode (single unit, useful for suffixes)
 * formatDuration(5400000, { compact: true }); // → "1h"
 * formatDuration(90000, { compact: true }); // → "1m"
 * ```
 *
 * @param   milliseconds - Duration in milliseconds
 * @param   options      - Formatting options
 *
 * @returns              Human-readable duration string
 */
export function formatDuration(
  milliseconds: number,
  options?: {
    /**
     * Only show the first unit: "1h 30m" → "1h"
     *
     * Useful for generating suffixes or compact displays. Setting this to `true` overrides `unitCount`.
     */
    compact?: boolean;

    /**
     * Number of units to show: "1d 2h 30m 15s" with unitCount: 2 → "1d 2h"
     *
     * Useful for showing more precision than compact mode while still limiting verbosity. Defaults to showing all
     * units.
     */
    unitCount?: number;
  },
): string {
  if (!Number.isFinite(milliseconds)) {
    InvariantViolationError.of({
      errorCode: 'DURATION_MILLISECONDS_NOT_FINITE',
      message: `formatDuration requires a finite number, got: ${milliseconds}`,
      meta: { milliseconds },
    });

    return '0ms';
  }

  return prettyMilliseconds(milliseconds, {
    ...(options?.compact !== undefined ? { compact: options.compact } : {}),
    secondsDecimalDigits: 0,
    ...(options?.unitCount !== undefined
      ? { unitCount: options.unitCount }
      : {}),
  });
}
