import { createAppError } from './app-error.js';
import { err, ok } from 'true-myth/result';

/**
 * JSON-safe serialized error shape mirroring the AppError interface.
 *
 * All optional fields use `T | undefined` (not `T?`) so callers can construct and spread these objects directly without
 * conditional checks. JSON.stringify strips `undefined` values automatically.
 */

/**
 * Discriminated union for serialized Result values over the wire.
 *
 * Discriminated by `ok`/`err` presence. No default for `TError` — always explicit at the call site.
 */

/**
 * Serialize an AppError into an SerializedAppError.
 *
 * Recursively serializes the `cause` chain. All AppError fields are spread directly — no remapping needed because
 * SerializedAppError uses the same field names as AppError.
 */
function toSerializedAppError({
  error: {
    cause,
    errorCode,
    errorGroup,
    message,
    meta,
    severity,
    type
  }
}) {
  return {
    cause: cause !== undefined ? toSerializedAppError({
      error: cause
    }) : undefined,
    errorCode,
    errorGroup,
    message,
    meta: meta,
    severity,
    time: new Date().toISOString(),
    type
  };
}

/**
 * Cache of runtime-created error classes keyed by type name.
 *
 * Avoids creating a new class via `createAppError` for every deserialized error — we reuse the same class for all
 * errors of the same `type`.
 */
const errorClassCache = new Map();

/**
 * Inverse of {@link serializeResult}. Normalizes WarpDrive-originated `err: null` to absent.
 */
function fromSerializedResult({
  serialized
}) {
  const errValue = ('err' in serialized ? serialized.err : undefined) ?? undefined;
  if (errValue !== undefined) {
    return err(fromSerializedAppError({
      errorJson: errValue
    }));
  }
  return ok(serialized.ok);
}

/**
 * Reconstruct an AppError from an SerializedAppError.
 *
 * Uses `createAppError` — the same factory all generic error types use — to create a concrete class matching the
 * serialized error's `type`, then constructs an instance. This is the same underlying mechanism as `.of()` on the
 * generic error types.
 */
function fromSerializedAppError({
  errorJson
}) {
  const {
    cause,
    errorCode,
    errorGroup,
    message,
    meta,
    severity,
    type
  } = errorJson;
  let DynamicError = errorClassCache.get(type);
  if (DynamicError === undefined) {
    DynamicError = createAppError({
      defaultEmitLog: false,
      type
    });
    errorClassCache.set(type, DynamicError);
  }
  return new DynamicError({
    cause: cause !== undefined ? fromSerializedAppError({
      errorJson: cause
    }) : undefined,
    errorCode,
    errorGroup,
    message,
    meta: meta ?? {},
    severity: severity
  });
}

/**
 * Construct a failure SerializedResult from an AppError. Internally calls toSerializedAppError.
 */
function serializedErr(error) {
  return {
    err: toSerializedAppError({
      error
    })
  };
}

/**
 * Construct a success SerializedResult from a raw ok value.
 */
function serializedOk(ok) {
  return {
    ok
  };
}

/**
 * Serialize a Result<TOk, AppError> into a SerializedResult<TOk, SerializedAppError>.
 */
function serializeResult({
  result
}) {
  return result.match({
    Err: error => serializedErr(error),
    Ok: value => serializedOk(value)
  });
}

/**
 * Narrow a value to a SerializedResult using runtime shape detection.
 *
 * Useful at app boundaries where wire format is unknown and must be detected dynamically (e.g., field display
 * components that receive either a direct SerializedCurrencyValue or a SerializedResult wrapping one).
 */
function isSerializedResult(value) {
  return typeof value === 'object' && value !== null && ('ok' in value || 'err' in value);
}

export { fromSerializedAppError, fromSerializedResult, isSerializedResult, serializeResult, serializedErr, serializedOk, toSerializedAppError };
//# sourceMappingURL=serialized-app-error.js.map
