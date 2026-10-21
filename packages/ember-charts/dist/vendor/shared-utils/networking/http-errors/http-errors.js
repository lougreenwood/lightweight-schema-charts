import { NotFoundError } from '../../errors/not-found-error.js';
import { RateLimitedError } from '../../errors/rate-limited-error.js';
import { TimeoutError } from '../../errors/timeout-error.js';
import { UnauthorizedError } from '../../errors/unauthorized-error.js';
import { UnavailableError } from '../../errors/unavailable-error.js';
import { UpstreamError } from '../../errors/upstream-error.js';

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


/**
 * Shared base args for all HTTP error factories.
 */

/**
 * Optional logger context - uses Partial<HasLogger> for optional logger injection
 */

/**
 * Generic 4xx client error (excluding 401/403/404/429 which have dedicated variants). Examples: 400, 409, 422, etc.
 */
function http4xxClientError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_4XX_CLIENT_ERROR',
    message,
    meta
  });
}
function http5xxServerError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_5XX_SERVER_ERROR',
    message,
    meta
  });
}
function http200InvalidResponseStructureError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_200_INVALID_RESPONSE_STRUCTURE',
    message,
    meta: {
      ...meta,
      status: 200,
      statusText: 'OK'
    }
  });
}
function http204NoContentError({
  message,
  meta,
  ...baseArgs
}) {
  return NotFoundError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_204_NO_CONTENT',
    message,
    meta: {
      ...meta,
      status: 204,
      statusText: 'No Content'
    }
  });
}
function http401UnauthorizedError({
  message,
  meta,
  ...baseArgs
}) {
  return UnauthorizedError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_401_UNAUTHORIZED',
    message,
    meta: {
      ...meta,
      status: 401,
      statusText: 'Unauthorized'
    }
  });
}
function http403ForbiddenError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_403_FORBIDDEN',
    message,
    meta: {
      ...meta,
      status: 403,
      statusText: 'Forbidden'
    }
  });
}
function http404NotFoundError({
  message,
  meta,
  ...baseArgs
}) {
  return NotFoundError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_404_NOT_FOUND',
    message,
    meta: {
      ...meta,
      status: 404,
      statusText: 'Not Found'
    }
  });
}
function http408TimeoutError({
  message,
  meta,
  ...baseArgs
}) {
  return TimeoutError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_408_TIMEOUT',
    message,
    meta: {
      ...meta,
      status: 408,
      statusText: 'Request Timeout'
    }
  });
}
function http429RateLimitedError({
  message,
  meta,
  ...baseArgs
}) {
  return RateLimitedError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_429_RATE_LIMITED',
    message,
    meta: {
      ...meta,
      status: 429,
      statusText: 'Too Many Requests'
    }
  });
}
function httpNetworkUnavailableError({
  message,
  meta,
  ...baseArgs
}) {
  return UnavailableError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_NETWORK_UNAVAILABLE',
    message,
    meta
  });
}
function httpResponseParseFailedError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_RESPONSE_PARSE_FAILED',
    message,
    meta: {
      ...meta,
      status: 0,
      statusText: 'Unknown'
    }
  });
}
function httpUnknownError({
  message,
  meta,
  ...baseArgs
}) {
  return UpstreamError.of({
    ...toErrorFactoryArgs(baseArgs),
    errorCode: 'HTTP_UNKNOWN_ERROR',
    message,
    meta: {
      ...meta,
      status: 0,
      statusText: 'Unknown'
    }
  });
}
function toErrorFactoryArgs({
  cause,
  context,
  emitLog,
  severity
}) {
  const result = {
    cause
  };
  if (context !== undefined) result.context = context;
  if (emitLog !== undefined) result.emitLog = emitLog;
  if (severity !== undefined) result.severity = severity;
  return result;
}

export { http200InvalidResponseStructureError, http204NoContentError, http401UnauthorizedError, http403ForbiddenError, http404NotFoundError, http408TimeoutError, http429RateLimitedError, http4xxClientError, http5xxServerError, httpNetworkUnavailableError, httpResponseParseFailedError, httpUnknownError };
//# sourceMappingURL=http-errors.js.map
