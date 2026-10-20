import type {
  MillisecondsValidationError,
  SuffixInvariantViolationError,
  WindowSuffixes,
} from '#src/vendor/shared-utils/time-normalization/types';

export type {
  MillisecondsValidationError,
  SuffixInvariantViolationError,
  WindowSuffixes,
};
import { InvariantViolationError } from '#src/vendor/shared-utils/errors/invariant-violation-error';
import { ValidationError } from '#src/vendor/shared-utils/errors/validation-error';
import { Result } from 'true-myth';
import { err, ok } from 'true-myth/result';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function deriveSuffix({
  milliseconds,
}: {
  milliseconds: number;
}): Result<string, MillisecondsValidationError> {
  if (milliseconds <= 0) {
    return Result.err(
      ValidationError.of({
        errorCode: 'INVALID_MILLISECONDS',
        message: `milliseconds must be > 0 (got ${milliseconds})`,
        meta: { milliseconds },
      }),
    );
  }

  switch (true) {
    case milliseconds % MS_PER_DAY === 0:
      return Result.ok(`${milliseconds / MS_PER_DAY}d`);

    case milliseconds % MS_PER_HOUR === 0:
      return Result.ok(`${milliseconds / MS_PER_HOUR}h`);

    case milliseconds % MS_PER_MINUTE === 0:
      return Result.ok(`${milliseconds / MS_PER_MINUTE}m`);

    case milliseconds % MS_PER_SECOND === 0:
      return Result.ok(`${milliseconds / MS_PER_SECOND}s`);

    default:
      return Result.ok(`${milliseconds}ms`);
  }
}

export function deriveWindowSuffixes({
  windowsMs,
}: {
  windowsMs: number[];
}): Result<
  WindowSuffixes,
  MillisecondsValidationError | SuffixInvariantViolationError
> {
  const seenSuffixes = new Map<string, number>();

  return windowsMs.reduce<
    Result<
      WindowSuffixes,
      MillisecondsValidationError | SuffixInvariantViolationError
    >
  >(
    (acc, milliseconds) => {
      return acc.match({
        Err: (error) => err(error),
        Ok: (suffixMap) => {
          return deriveSuffix({ milliseconds }).andThen((suffix) => {
            const existingMs = seenSuffixes.get(suffix);

            if (existingMs !== undefined) {
              return err(
                InvariantViolationError.of({
                  errorCode: 'DUPLICATE_SUFFIX',
                  message: `Duplicate suffix "${suffix}" for windows ${existingMs}ms and ${milliseconds}ms`,
                  meta: {
                    allWindowsMs: windowsMs,
                    details: { milliseconds, suffix },
                    invariant: 'Each window must produce a unique suffix',
                  },
                }),
              );
            }

            suffixMap.set(milliseconds, suffix);
            seenSuffixes.set(suffix, milliseconds);

            return ok(suffixMap);
          });
        },
      });
    },
    Result.ok(new Map<number, string>() as WindowSuffixes),
  );
}
