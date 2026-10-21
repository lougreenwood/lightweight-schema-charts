/**
 * Series value interpretation.
 *
 * A presenter may project any value shape: a number, a domain object, or a composite. The chart cannot read those
 * shapes, so it asks a registered handler to interpret them into series primitives. The package never imports the
 * consumer's value types.
 */

export type InterpretedOhlc = Readonly<{
  close: number;
  high: number;
  low: number;
  open: number;
}>;

export interface SeriesValueHandler {
  /** Stable identifier used by descriptors. */
  readonly id: string;

  /** Interpret an arbitrary value as a number for scalar series. */
  toNumber(value: unknown): number;

  /** Interpret an arbitrary value as OHLC for candlestick series. */
  toOhlc?(value: unknown): InterpretedOhlc;

  /** Format a numeric price for the axis and crosshair. */
  formatNumber?(value: number): string;
}

export type SeriesValueHandlers = Readonly<Record<string, SeriesValueHandler>>;

/**
 * Apply a handler to projected points. Without a handler the points pass through unchanged, which is correct for
 * plain numeric or OHLC values.
 *
 * The cast at the boundary is deliberate: the handler guarantees the interpreted shape matches the adapter's expected
 * point type, and the adapter validates nothing further.
 */
export function interpretProjectedPoints<
  TPoint extends Readonly<{ time: Date; value: unknown }>,
>({
  points,
  handler,
}: {
  points: ReadonlySet<TPoint>;
  handler: SeriesValueHandler | undefined;
}): ReadonlySet<TPoint> {
  if (handler === undefined) {
    return points;
  }

  return new Set(
    points.values().map((point) => {
      const value = point.value;
      const isOhlc =
        handler.toOhlc !== undefined &&
        typeof value === 'object' &&
        value !== null &&
        'open' in value;

      const interpreted = isOhlc
        ? handler.toOhlc?.(value)
        : handler.toNumber(value);

      return { ...point, value: interpreted } as TPoint;
    }),
  );
}
