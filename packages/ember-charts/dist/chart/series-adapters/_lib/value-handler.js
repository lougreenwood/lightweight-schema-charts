import { EmptyResultError } from '../../../vendor/shared-utils/errors/empty-result-error.js';
import { PreconditionError } from '../../../vendor/shared-utils/errors/precondition-error.js';
import { ValidationError } from '../../../vendor/shared-utils/errors/validation-error.js';
import { err, all, ok } from 'true-myth/result';

function validateSeriesNumber(value) {
  if (isFiniteNumber(value)) return ok(value);
  return err(ValidationError.of({
    errorCode: 'SERIES_VALUE_NUMBER_INVALID',
    message: 'A scalar series value must be a finite number.',
    emitLog: false
  }));
}
function validateSeriesOhlc(value) {
  if (value && typeof value === 'object' && 'open' in value && isFiniteNumber(value.open) && 'high' in value && isFiniteNumber(value.high) && 'low' in value && isFiniteNumber(value.low) && 'close' in value && isFiniteNumber(value.close)) {
    return ok({
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close
    });
  }
  return err(ValidationError.of({
    errorCode: 'SERIES_VALUE_OHLC_INVALID',
    message: 'An OHLC series value must contain four finite numbers.',
    emitLog: false
  }));
}

/** The default validates numeric values; it never unwraps consumer domain objects. */
const numericSeriesValueHandler = {
  id: 'numeric',
  toNumber: validateSeriesNumber,
  toOhlc: validateSeriesOhlc
};

/** Interpret a non-empty batch before mutating an upstream series. */
function interpretProjectedPoints({
  points,
  handler,
  seriesKind
}) {
  if (points.size === 0) {
    return err(EmptyResultError.of({
      errorCode: 'SERIES_VALUE_POINTS_EMPTY',
      message: 'There are no projected points to interpret.',
      emitLog: false
    }));
  }
  return all(points.values().map(point => interpretProjectedPoint({
    point,
    handler,
    seriesKind
  })).toArray()).map(interpreted => new Set(interpreted));
}
function interpretProjectedPoint({
  point,
  handler,
  seriesKind
}) {
  if (seriesKind === 'bar' || seriesKind === 'candlestick') {
    if (handler.toOhlc === undefined) {
      return err(PreconditionError.of({
        errorCode: 'SERIES_VALUE_OHLC_CONVERTER_MISSING',
        message: 'The selected value handler does not support OHLC series.',
        meta: {
          handlerId: handler.id
        },
        emitLog: false
      }));
    }
    return handler.toOhlc(point.value).andThen(validateSeriesOhlc).map(value => ({
      time: point.time,
      value
    }));
  }
  return handler.toNumber(point.value).andThen(validateSeriesNumber).map(value => ({
    time: point.time,
    value
  }));
}
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export { interpretProjectedPoints, numericSeriesValueHandler, validateSeriesNumber, validateSeriesOhlc };
//# sourceMappingURL=value-handler.js.map
