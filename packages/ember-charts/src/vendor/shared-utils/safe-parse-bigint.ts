import { ValidationError } from './errors/validation-error';
import { Result } from 'true-myth';

/**
 * Parse of a string-encoded `BigInt` failed — the value is not a valid bigint literal.
 */
export type BigIntParseError = ValidationError<{
  errorCode: 'INVALID_BIGINT';
  message: string;
  meta: { cause: unknown; value: string };
}>;

/**
 * Parse a string into a {@link BigInt}, returning a {@link Result}.
 *
 * Wraps the `BigInt()` constructor which throws on invalid input. Callers get a typed
 * {@link Result} they can compose with `.andThen()`/`.orElse()` instead of try/catch.
 *
 * @param value — The string to parse
 * @returns `Ok(bigint)` on success, `Err(BigIntParseError)` on invalid input
 */
export function safeParseBigint(
  value: string,
): Result<bigint, BigIntParseError> {
  try {
    return Result.ok(BigInt(value));
  } catch (error) {
    return Result.err(
      ValidationError.of({
        emitLog: false,
        errorCode: 'INVALID_BIGINT',
        message: `Cannot parse '${value}' as bigint`,
        meta: { cause: error, value },
      }),
    );
  }
}
