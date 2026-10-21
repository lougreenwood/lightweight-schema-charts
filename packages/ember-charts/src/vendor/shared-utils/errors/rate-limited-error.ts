import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from './app-error';

/**
 * RateLimitedError instance type - use this in type positions.
 *
 * @example Type BitQueryRateLimitedError = RateLimitedError<{ errorCode: 'BITQUERY_RATE_LIMITED'; message: string;
 * meta?: { dependency: string; retryAfterMs?: number }; }>;
 */
export type RateLimitedError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'RateLimitedError';
  }>;

/**
 * Generic error for when an API or resource rate limit is hit.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for API throttling, request quota exceeded, or any rate limiting scenario.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type BitQueryRateLimitedError = RateLimitedError<{
 * errorCode: 'BITQUERY_RATE_LIMITED'; meta: { dependency: 'BitQueryAPI'; retryAfterMs?: number }; }>;
 *
 * // Use in function return type function fetchFromBitQuery(): Result<Data, BitQueryRateLimitedError> { return
 * Result.err( RateLimitedError.of({ errorCode: 'BITQUERY_RATE_LIMITED', message: 'BitQuery API rate limit exceeded',
 * meta: { dependency: 'BitQueryAPI', retryAfterMs: 5000 }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type ApiRateLimitedError = RateLimitedError<{
 * errorCode: 'API_RATE_LIMITED'; message: string; meta?: { dependency: string; retryAfterMs?: number }; }>; type
 * RedisRateLimitedError = RateLimitedError<{ errorCode: 'REDIS_RATE_LIMITED'; message: string; meta?: { dependency:
 * string; retryAfterMs?: number }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'API_RATE_LIMITED': //
 * Handle public API throttling break; case 'REDIS_RATE_LIMITED': // Handle Redis-side rate limiting break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) RateLimitedError.of({ errorCode:
 * 'RATE_LIMITED' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * RateLimitedError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * RateLimitedError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const RateLimitedError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'warn',
  type: 'RateLimitedError',
});
