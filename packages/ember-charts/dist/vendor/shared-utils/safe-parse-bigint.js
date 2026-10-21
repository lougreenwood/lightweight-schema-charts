import { ValidationError } from './errors/validation-error.js';
import { Result } from 'true-myth';

/**
 * Parse of a string-encoded `BigInt` failed — the value is not a valid bigint literal.
 */

/**
 * Parse a string into a {@link BigInt}, returning a {@link Result}.
 *
 * Wraps the `BigInt()` constructor which throws on invalid input. Callers get a typed
 * {@link Result} they can compose with `.andThen()`/`.orElse()` instead of try/catch.
 *
 * @param value — The string to parse
 * @returns `Ok(bigint)` on success, `Err(BigIntParseError)` on invalid input
 */
function safeParseBigint(value) {
  try {
    return Result.ok(BigInt(value));
  } catch (error) {
    return Result.err(ValidationError.of({
      emitLog: false,
      errorCode: 'INVALID_BIGINT',
      message: `Cannot parse '${value}' as bigint`,
      meta: {
        cause: error,
        value
      }
    }));
  }
}

export { safeParseBigint };
//# sourceMappingURL=safe-parse-bigint.js.map
