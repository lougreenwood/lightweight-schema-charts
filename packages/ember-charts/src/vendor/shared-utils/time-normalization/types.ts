import type { InvariantViolationError } from '../errors/invariant-violation-error';
import type { ValidationError } from '../errors/validation-error';

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
