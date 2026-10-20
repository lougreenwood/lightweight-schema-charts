import type { InvariantViolationError } from '#src/vendor/shared-utils/errors/invariant-violation-error';
import type { ValidationError } from '#src/vendor/shared-utils/errors/validation-error';

export type MillisecondsValidationError = ValidationError<{
  errorCode: 'INVALID_MILLISECONDS';
  message: string;
  meta: {
    milliseconds: number;
  };
}>;

export type SuffixInvariantViolationError = InvariantViolationError<{
  errorCode: 'DUPLICATE_SUFFIX';
  message: string;
  meta: {
    allWindowsMs: number[];
    details: {
      milliseconds: number;
      suffix: string;
    };
    invariant: string;
  };
}>;

export type WindowSuffixes = Map<number, string>;
