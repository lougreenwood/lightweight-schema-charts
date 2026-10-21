import type { ProjectedSeriesPoint } from '../../data-stream-presenters/_lib/abstract-data-stream-presenter/types';
import type { SeriesAdapterInternalPoint } from './_adapter';
import type { SeriesType } from './_registry/types';
import type {
  SeriesValueNumberValidationError,
  SeriesValueOhlcConverterMissingError,
  SeriesValueOhlcValidationError,
  SeriesValuePointsEmptyError,
} from './value-handler/errors';
import type {
  InterpretedOhlc,
  SeriesValueHandler,
} from './value-handler/types';

import { EmptyResultError } from '../../../vendor/shared-utils/errors/empty-result-error';
import { PreconditionError } from '../../../vendor/shared-utils/errors/precondition-error';
import { ValidationError } from '../../../vendor/shared-utils/errors/validation-error';
import { all, err, ok, type Result } from 'true-myth/result';

export function validateSeriesNumber(
  value: unknown,
): Result<number, SeriesValueNumberValidationError> {
  if (isFiniteNumber(value)) return ok(value);
  return err(
    ValidationError.of({
      errorCode: 'SERIES_VALUE_NUMBER_INVALID',
      message: 'A scalar series value must be a finite number.',
      emitLog: false,
    }),
  );
}

export function validateSeriesOhlc(
  value: unknown,
): Result<InterpretedOhlc, SeriesValueOhlcValidationError> {
  if (
    value &&
    typeof value === 'object' &&
    'open' in value &&
    isFiniteNumber(value.open) &&
    'high' in value &&
    isFiniteNumber(value.high) &&
    'low' in value &&
    isFiniteNumber(value.low) &&
    'close' in value &&
    isFiniteNumber(value.close)
  ) {
    return ok({
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close,
    });
  }
  return err(
    ValidationError.of({
      errorCode: 'SERIES_VALUE_OHLC_INVALID',
      message: 'An OHLC series value must contain four finite numbers.',
      emitLog: false,
    }),
  );
}

/** The default validates numeric values; it never unwraps consumer domain objects. */
export const numericSeriesValueHandler: SeriesValueHandler = {
  id: 'numeric',
  toNumber: validateSeriesNumber,
  toOhlc: validateSeriesOhlc,
};

/** Interpret a non-empty batch before mutating an upstream series. */
export function interpretProjectedPoints({
  points,
  handler,
  seriesKind,
}: {
  points: ReadonlySet<ProjectedSeriesPoint>;
  handler: SeriesValueHandler;
  seriesKind: SeriesType;
}): Result<
  ReadonlySet<SeriesAdapterInternalPoint>,
  | SeriesValueNumberValidationError
  | SeriesValueOhlcValidationError
  | SeriesValueOhlcConverterMissingError
  | SeriesValuePointsEmptyError
> {
  if (points.size === 0) {
    return err(
      EmptyResultError.of({
        errorCode: 'SERIES_VALUE_POINTS_EMPTY',
        message: 'There are no projected points to interpret.',
        emitLog: false,
      }),
    );
  }
  return all(
    points
      .values()
      .map((point) => interpretProjectedPoint({ point, handler, seriesKind }))
      .toArray(),
  ).map((interpreted) => new Set(interpreted));
}

function interpretProjectedPoint({
  point,
  handler,
  seriesKind,
}: {
  point: ProjectedSeriesPoint;
  handler: SeriesValueHandler;
  seriesKind: SeriesType;
}): Result<
  SeriesAdapterInternalPoint,
  | SeriesValueNumberValidationError
  | SeriesValueOhlcValidationError
  | SeriesValueOhlcConverterMissingError
> {
  if (seriesKind === 'bar' || seriesKind === 'candlestick') {
    if (handler.toOhlc === undefined) {
      return err(
        PreconditionError.of({
          errorCode: 'SERIES_VALUE_OHLC_CONVERTER_MISSING',
          message: 'The selected value handler does not support OHLC series.',
          meta: { handlerId: handler.id },
          emitLog: false,
        }),
      );
    }
    return handler
      .toOhlc(point.value)
      .andThen(validateSeriesOhlc)
      .map((value) => ({ time: point.time, value }));
  }
  return handler
    .toNumber(point.value)
    .andThen(validateSeriesNumber)
    .map((value) => ({ time: point.time, value }));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
