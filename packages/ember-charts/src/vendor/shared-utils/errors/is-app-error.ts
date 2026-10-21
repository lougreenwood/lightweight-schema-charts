import type { AppErrorArgs } from './app-error';
import type { AppError } from './app-error';

import type { LiteralToPrimitive } from 'type-fest';

export function isAppError(
  value: unknown,
): value is AppError<AppErrorArgs & AppErrorArgs>;
export function isAppError<TErrorCode extends string>(
  maybeAppError: { errorCode?: LiteralToPrimitive<string | TErrorCode> },
  errorCode: TErrorCode,
): maybeAppError is AppError<AppErrorArgs & AppErrorArgs> & {
  errorCode: TErrorCode;
};
export function isAppError(
  value: unknown,
  errorCode?: string,
): value is AppError<AppErrorArgs & AppErrorArgs> {
  if (!(value instanceof Error)) return false;
  if (!('errorCode' in value) || typeof value.errorCode !== 'string')
    return false;
  if (errorCode !== undefined) return value.errorCode === errorCode;
  return true;
}
