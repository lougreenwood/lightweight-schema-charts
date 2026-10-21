/**
 * Centralized HTTP AppError aliases (adapter-agnostic) with status-coded names and errorCodes.
 *
 * Conventions:
 *
 * - All meta fields are REQUIRED for each variant (no optional meta).
 * - Status/statusText remain in meta (top-level schema is fixed by AppError).
 * - Names and errorCodes include the HTTP status code when the condition has a concrete status.
 * - HTTP implies upstream/external; we omit "Upstream" from names/codes.
 *
 * Retry guidance (typical defaults; callers may vary as needed):
 *
 * - Retryable: HTTP_0_NETWORK_UNAVAILABLE, HTTP_5XX_SERVER_ERROR, HTTP_429_RATE_LIMITED, HTTP_408_TIMEOUT
 * - Usually non-retryable: HTTP_4XX_CLIENT_ERROR, HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND
 */

import type { NotFoundError } from '../../errors/not-found-error';
import type { RateLimitedError } from '../../errors/rate-limited-error';
import type { TimeoutError } from '../../errors/timeout-error';
import type { UnauthorizedError } from '../../errors/unauthorized-error';
import type { UnavailableError } from '../../errors/unavailable-error';
import type { UpstreamError } from '../../errors/upstream-error';
import type { IntRange } from 'type-fest';

/**
 * Other client errors (HTTP 4xx not explicitly broken out above). Example: 400, 409, 422, etc.
 */
export type Http4xxClientError = UpstreamError<{
  errorCode: 'HTTP_4XX_CLIENT_ERROR';
  message: string;
  meta: {
    method: HttpMethod;
    responseBody?: unknown;
    status: HttpStatus4xx; // 400–499 excluding 401/403/404/429
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Server errors (HTTP 5xx).
 */
export type Http5xxServerError = UpstreamError<{
  errorCode: 'HTTP_5XX_SERVER_ERROR';
  message: string;
  meta: {
    apiErrors?: readonly Record<string, unknown>[];
    method: HttpMethod;
    responseBody?: unknown;
    status: HttpStatus5xx;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Response parsed but did not match expected structure (contract violation). When this occurs after a 2xx, set
 * status=200/statusText='OK' in meta.
 */
export type Http200InvalidResponseStructureError = UpstreamError<{
  errorCode: 'HTTP_200_INVALID_RESPONSE_STRUCTURE';
  message: string;
  meta: {
    method: HttpMethod;
    response: unknown;
    status: 200;
    statusText: string; // e.g., 'OK'
    upstream: string;
    url: string;
  };
}>;

/**
 * No Content (HTTP 204).
 *
 * The request succeeded but there is no content to return. Used when the response body is legitimately empty (e.g.,
 * transaction data not yet indexed, resource exists but has no content).
 */
export type Http204NoContentError = NotFoundError<{
  errorCode: 'HTTP_204_NO_CONTENT';
  message: string;
  meta: {
    method: HttpMethod;
    status: 204;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Unauthorized (HTTP 401).
 */
export type Http401UnauthorizedError = UnauthorizedError<{
  errorCode: 'HTTP_401_UNAUTHORIZED';
  message: string;
  meta: {
    method: HttpMethod;
    status: 401;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Forbidden (HTTP 403).
 */
export type Http403ForbiddenError = UpstreamError<{
  errorCode: 'HTTP_403_FORBIDDEN';
  message: string;
  meta: {
    method: HttpMethod;
    status: 403;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Not Found (HTTP 404).
 */
export type Http404NotFoundError = NotFoundError<{
  errorCode: 'HTTP_404_NOT_FOUND';
  message: string;
  meta: {
    method: HttpMethod;
    status: 404;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * HTTP request timeout (HTTP 408).
 *
 * The request exceeded its allowed duration. This includes connection timeouts, read timeouts, and overall request
 * timeouts.
 */
export type Http408TimeoutError = TimeoutError<{
  errorCode: 'HTTP_408_TIMEOUT';
  message: string;
  meta: {
    method: HttpMethod;
    status: 408;
    statusText: string;
    timeoutMs: number;
    upstream: string;
    url: string;
  };
}>;

/**
 * Rate-limited (HTTP 429). retryAfterMs must be provided; use 0 when Retry-After header is absent.
 */
export type Http429RateLimitedError = RateLimitedError<{
  errorCode: 'HTTP_429_RATE_LIMITED';
  message: string;
  meta: {
    method: HttpMethod;
    retryAfterMs: number; // 0 when header not present
    status: 429;
    statusText: string;
    upstream: string;
    url: string;
  };
}>;

/**
 * Union alias for all HTTP-related errors.
 */
export type HttpError =
  | Http4xxClientError
  | Http5xxServerError
  | Http200InvalidResponseStructureError
  | Http204NoContentError
  | Http401UnauthorizedError
  | Http403ForbiddenError
  | Http404NotFoundError
  | Http408TimeoutError
  | Http429RateLimitedError
  | HttpNetworkUnavailableError
  | HttpResponseParseFailedError
  | HttpUnknownError;

/**
 * Canonical HTTP method type for error meta.
 */
export type HttpMethod =
  'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';

/**
 * Network/transport failure (no HTTP response available). Examples: DNS failure, connection refused, CORS network
 * error.
 */
export type HttpNetworkUnavailableError = UnavailableError<{
  errorCode: 'HTTP_NETWORK_UNAVAILABLE';
  message: string;
  meta: {
    cause: string;
    method: HttpMethod;
    upstream: string;
    url: string;
  };
}>;

/**
 * Response parse failure (malformed JSON, etc.). Use status=0/statusText='Unknown' when response details are not
 * available.
 */
export type HttpResponseParseFailedError = UpstreamError<{
  errorCode: 'HTTP_RESPONSE_PARSE_FAILED';
  message: string;
  meta: {
    method: HttpMethod;
    status?: number;
    statusText: string; // 'Unknown'
    upstream: string;
    url: string;
  };
}>;

/**
 * HTTP status codes in the 4xx range (client errors).
 */
export type HttpStatus4xx = IntRange<400, 500>;

/**
 * HTTP status codes in the 5xx range (server errors).
 */
export type HttpStatus5xx = IntRange<500, 600>;

/**
 * Unknown HTTP error (status unavailable or not recognized). Use status=0/statusText='Unknown'.
 */
export type HttpUnknownError = UpstreamError<{
  errorCode: 'HTTP_UNKNOWN_ERROR';
  message: string;
  meta: {
    cause?: unknown;
    method: HttpMethod;
    status?: number;
    statusText: string; // 'Unknown'
    upstream: string;
    url: string;
  };
}>;
