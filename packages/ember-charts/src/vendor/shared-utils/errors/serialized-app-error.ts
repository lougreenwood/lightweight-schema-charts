import type { AppErrorArgs } from './app-error';
import type { AppError, GenericErrorInstance } from './app-error';
import type { LogSeverity } from '../logger/types';
import type Result from 'true-myth/result';

import { createAppError } from './app-error';
import { err, ok } from 'true-myth/result';

export type FromSerializedAppError<T extends SerializedAppError> =
  GenericErrorInstance<{
    errorCode: T['errorCode'];
    errorGroup: NonNullable<T['errorGroup']>;
    message: T['message'];
    meta: NonNullable<T['meta']>;
    type: NonNullable<T['type']>;
  }>;

/**
 * JSON-safe serialized error shape mirroring the AppError interface.
 *
 * All optional fields use `T | undefined` (not `T?`) so callers can construct and spread these objects directly without
 * conditional checks. JSON.stringify strips `undefined` values automatically.
 */
export interface SerializedAppError {
  readonly cause: SerializedAppError | undefined;
  readonly errorCode: string;
  readonly errorGroup: string | undefined;
  readonly message: string;
  readonly meta: Record<string, unknown> | undefined;
  readonly severity: string;
  readonly time: string;
  readonly type: string;
}

/**
 * Discriminated union for serialized Result values over the wire.
 *
 * Discriminated by `ok`/`err` presence. No default for `TError` — always explicit at the call site.
 */
export type SerializedResult<TOk, TError extends SerializedAppError> =
  | Readonly<{ err: TError; ok?: never | undefined }>
  | Readonly<{ err?: never | undefined; ok: TOk }>;

/**
 * Serialize an AppError into an SerializedAppError.
 *
 * Recursively serializes the `cause` chain. All AppError fields are spread directly — no remapping needed because
 * SerializedAppError uses the same field names as AppError.
 */
export function toSerializedAppError({
  error: { cause, errorCode, errorGroup, message, meta, severity, type },
}: {
  error: AppError<AppErrorArgs & AppErrorArgs>;
}): SerializedAppError {
  return {
    cause:
      cause !== undefined
        ? toSerializedAppError({
            error: cause as AppError<AppErrorArgs & AppErrorArgs>,
          })
        : undefined,
    errorCode,
    errorGroup,
    message,
    meta: meta as Record<string, unknown> | undefined,
    severity,
    time: new Date().toISOString(),
    type,
  };
}

/**
 * Cache of runtime-created error classes keyed by type name.
 *
 * Avoids creating a new class via `createAppError` for every deserialized error — we reuse the same class for all
 * errors of the same `type`.
 */
const errorClassCache = new Map<string, ReturnType<typeof createAppError>>();

/**
 * Inverse of {@link serializeResult}. Normalizes WarpDrive-originated `err: null` to absent.
 */
export function fromSerializedResult<TOk, TError extends SerializedAppError>({
  serialized,
}: {
  serialized: SerializedResult<TOk, TError>;
}): Result<TOk, FromSerializedAppError<TError>> {
  const errValue =
    ('err' in serialized ? serialized.err : undefined) ?? undefined;

  if (errValue !== undefined) {
    return err(fromSerializedAppError({ errorJson: errValue }));
  }

  return ok(serialized.ok!);
}

/**
 * Reconstruct an AppError from an SerializedAppError.
 *
 * Uses `createAppError` — the same factory all generic error types use — to create a concrete class matching the
 * serialized error's `type`, then constructs an instance. This is the same underlying mechanism as `.of()` on the
 * generic error types.
 */
export function fromSerializedAppError<TError extends SerializedAppError>({
  errorJson,
}: {
  errorJson: TError;
}): FromSerializedAppError<TError> {
  const { cause, errorCode, errorGroup, message, meta, severity, type } =
    errorJson;

  let DynamicError = errorClassCache.get(type);
  if (DynamicError === undefined) {
    DynamicError = createAppError({ defaultEmitLog: false, type });
    errorClassCache.set(type, DynamicError);
  }

  return new DynamicError({
    cause:
      cause !== undefined
        ? fromSerializedAppError({ errorJson: cause })
        : undefined,
    errorCode,
    errorGroup,
    message,
    meta: meta ?? {},
    severity: severity as LogSeverity,
  });
}

/**
 * Construct a failure SerializedResult from an AppError. Internally calls toSerializedAppError.
 */
export function serializedErr(error: AppError<AppErrorArgs & AppErrorArgs>): {
  readonly err: SerializedAppError;
} {
  return { err: toSerializedAppError({ error }) };
}

/**
 * Construct a success SerializedResult from a raw ok value.
 */
export function serializedOk<const TOk>(ok: TOk): { readonly ok: TOk } {
  return { ok };
}

/**
 * Serialize a Result<TOk, AppError> into a SerializedResult<TOk, SerializedAppError>.
 */
export function serializeResult<TOk>({
  result,
}: {
  result: Result<TOk, AppError<AppErrorArgs & AppErrorArgs>>;
}): SerializedResult<TOk, SerializedAppError> {
  return result.match({
    Err: (error) =>
      serializedErr(error) as SerializedResult<TOk, SerializedAppError>,
    Ok: (value) =>
      serializedOk(value) as SerializedResult<TOk, SerializedAppError>,
  });
}

/**
 * Narrow a value to a SerializedResult using runtime shape detection.
 *
 * Useful at app boundaries where wire format is unknown and must be detected dynamically (e.g., field display
 * components that receive either a direct SerializedCurrencyValue or a SerializedResult wrapping one).
 */
export function isSerializedResult(
  value: unknown,
): value is SerializedResult<unknown, SerializedAppError> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('ok' in value || 'err' in value)
  );
}
