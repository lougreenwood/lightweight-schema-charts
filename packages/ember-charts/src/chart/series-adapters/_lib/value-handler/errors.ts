import type { GenericErrorInstance } from '../../../../vendor/shared-utils/errors/app-error';
import type { EmptyResultError } from '../../../../vendor/shared-utils/errors/empty-result-error';
import type { PreconditionError } from '../../../../vendor/shared-utils/errors/precondition-error';
import type { ValidationError } from '../../../../vendor/shared-utils/errors/validation-error';

export type SeriesValueHandlerNotFoundError = GenericErrorInstance<{
  errorCode: 'SERIES_VALUE_HANDLER_NOT_FOUND';
  errorGroup: string;
  message: string;
  meta: { handlerId: string };
  type: 'NotFoundError';
}>;

export type SeriesValueNumberValidationError = ValidationError<{
  errorCode: 'SERIES_VALUE_NUMBER_INVALID';
  message: string;
}>;

export type SeriesValueOhlcValidationError = ValidationError<{
  errorCode: 'SERIES_VALUE_OHLC_INVALID';
  message: string;
}>;

export type SeriesValueOhlcConverterMissingError = PreconditionError<{
  errorCode: 'SERIES_VALUE_OHLC_CONVERTER_MISSING';
  message: string;
  meta: { handlerId: string };
}>;

export type SeriesValuePointsEmptyError = EmptyResultError<{
  errorCode: 'SERIES_VALUE_POINTS_EMPTY';
  message: string;
}>;
