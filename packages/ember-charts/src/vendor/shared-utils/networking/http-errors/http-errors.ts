/**
 * HTTP error factory functions.
 *
 * These factories build strongly-typed AppError instances for HTTP conditions with status-coded names and errorCodes.
 *
 * CRITICAL: Most factories enforce immutable HTTP status contracts. The status code and statusText are hardcoded and
 * MUST NOT be overridden by callers. This ensures the factory name and errorCode accurately represent the HTTP
 * condition and cannot be misused.
 *
 * EXCEPTION: Only http4xxClientError and http5xxServerError allow callers to pass flexible status and statusText
 * values, since these are generic catch-alls for any 4xx or 5xx range errors not covered by specific factories.
 *
 * Factory naming matches the error alias name, camel-cased:
 *
 * - Http404NotFoundError -> http404NotFoundError(...)
 * - Http429RateLimitedError -> http429RateLimitedError(...)
 *
 * Each factory accepts:
 *
 * - Message: string (required)
 * - Meta: typed object with required fields (upstream, url, method, etc.)
 * - Cause?: unknown
 * - Context?: Partial<HasLogger> (passed through to the underlying error)
 * - EmitLog?: boolean
 * - Severity?: LogSeverity
 */

import type { HasLogger, LogSeverity } from '../../logger/types';
import type {
  Http4xxClientError,
  Http5xxServerError,
  Http200InvalidResponseStructureError,
  Http204NoContentError,
  Http401UnauthorizedError,
  Http403ForbiddenError,
  Http404NotFoundError,
  Http408TimeoutError,
  Http429RateLimitedError,
  HttpError,
  HttpMethod,
  HttpNetworkUnavailableError,
  HttpResponseParseFailedError,
  HttpStatus4xx,
  HttpStatus5xx,
  HttpUnknownError,
} from './error-types';

import { NotFoundError } from '../../errors/not-found-error';
import { RateLimitedError } from '../../errors/rate-limited-error';
import { TimeoutError } from '../../errors/timeout-error';
import { UnauthorizedError } from '../../errors/unauthorized-error';
import { UnavailableError } from '../../errors/unavailable-error';
import { UpstreamError } from '../../errors/upstream-error';

/**
 * Shared base args for all HTTP error factories.
 */
interface HttpErrorFactoryBaseArgs {
  cause?: unknown;
  context?: MaybeHasLogger;
  emitLog?: boolean;
  message: string;
  severity?: LogSeverity;
}

/**
 * Optional logger context - uses Partial<HasLogger> for optional logger injection
 */
type MaybeHasLogger = Partial<HasLogger>;

/**
 * Generic 4xx client error (excluding 401/403/404/429 which have dedicated variants). Examples: 400, 409, 422, etc.
 */
export function http4xxClientError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    responseBody?: unknown;
    status: HttpStatus4xx; // 400–499 (excluding 401/403/404/429)
    statusText: string;
    upstream: string;
    url: string;
  };
}): Http4xxClientError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_4XX_CLIENT_ERROR',
    message,
    meta,
  });
}

export function http5xxServerError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    responseBody?: unknown;
    status: HttpStatus5xx; // 500–599
    statusText: string;
    upstream: string;
    url: string;
  };
}): Http5xxServerError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_5XX_SERVER_ERROR',
    message,
    meta,
  });
}

export function http200InvalidResponseStructureError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    response: unknown;
    upstream: string;
    url: string;
  };
}): Http200InvalidResponseStructureError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_200_INVALID_RESPONSE_STRUCTURE',
    message,
    meta: { ...meta, status: 200, statusText: 'OK' },
  });
}

export function http204NoContentError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): Http204NoContentError {
  return NotFoundError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_204_NO_CONTENT',
    message,
    meta: { ...meta, status: 204, statusText: 'No Content' },
  });
}

export function http401UnauthorizedError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): Http401UnauthorizedError {
  return UnauthorizedError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_401_UNAUTHORIZED',
    message,
    meta: { ...meta, status: 401, statusText: 'Unauthorized' },
  });
}

export function http403ForbiddenError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): Http403ForbiddenError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_403_FORBIDDEN',
    message,
    meta: { ...meta, status: 403, statusText: 'Forbidden' },
  });
}

export function http404NotFoundError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): Http404NotFoundError {
  return NotFoundError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_404_NOT_FOUND',
    message,
    meta: { ...meta, status: 404, statusText: 'Not Found' },
  });
}

export function http408TimeoutError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    timeoutMs: number;
    upstream: string;
    url: string;
  };
}): Http408TimeoutError {
  return TimeoutError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_408_TIMEOUT',
    message,
    meta: { ...meta, status: 408, statusText: 'Request Timeout' },
  });
}

export function http429RateLimitedError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    retryAfterMs: number; // 0 when Retry-After header not present
    upstream: string;
    url: string;
  };
}): Http429RateLimitedError {
  return RateLimitedError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_429_RATE_LIMITED',
    message,
    meta: { ...meta, status: 429, statusText: 'Too Many Requests' },
  });
}

export function httpNetworkUnavailableError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    cause: string;
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): HttpNetworkUnavailableError {
  return UnavailableError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_NETWORK_UNAVAILABLE',
    message,
    meta,
  });
}

export function httpResponseParseFailedError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): HttpResponseParseFailedError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_RESPONSE_PARSE_FAILED',
    message,
    meta: { ...meta, status: 0, statusText: 'Unknown' },
  });
}

export function httpUnknownError({
  message,
  meta,
  ...baseArgs
}: HttpErrorFactoryBaseArgs & {
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}): HttpUnknownError {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_UNKNOWN_ERROR',
    message,
    meta: { ...meta, status: 0, statusText: 'Unknown' },
  });
}

function toErrorFactoryArgs({
  cause,
  context,
  emitLog,
  severity,
}: Pick<
  HttpErrorFactoryBaseArgs,
  'cause' | 'context' | 'emitLog' | 'severity'
>) {
  const result: {
    cause: unknown;
    context?: MaybeHasLogger;
    emitLog?: boolean;
    severity?: LogSeverity;
  } = { cause };
  if (context !== undefined) result.context = context;
  if (emitLog !== undefined) result.emitLog = emitLog;
  if (severity !== undefined) result.severity = severity;
  return result;
}

export type { HttpError };
export type { HttpMethod };
