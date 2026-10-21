import { createAppError } from './app-error.js';

/**
 * UnavailableError instance type - use this in type positions.
 *
 * @example Type BitQueryUnavailableError = UnavailableError<{ errorCode: 'BITQUERY_UNAVAILABLE'; message: string;
 * meta?: { dependency: string; reason?: string }; }>;
 */

/**
 * Generic error for when a dependency or service is unavailable (network error, API downtime, connection pool
 * exhaustion, or any temporary disruption).
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type BitQueryUnavailableError = UnavailableError<{
 * errorCode: 'BITQUERY_UNAVAILABLE'; meta: { dependency: 'BitQueryAPI'; reason?: string }; }>;
 *
 * // Use in function return type function fetchFromBitQuery(...): Result<Data, BitQueryUnavailableError> { return
 * Result.err( UnavailableError.of({ errorCode: 'BITQUERY_UNAVAILABLE', message: 'BitQueryAPI is unavailable - Network
 * timeout', meta: { dependency: 'BitQueryAPI', reason: 'Network timeout' }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type DatabaseUnavailableError = UnavailableError<{
 * errorCode: 'DATABASE_UNAVAILABLE'; message: string; meta?: { dependency: string; reason?: string }; }>; type
 * RedisUnavailableError = UnavailableError<{ errorCode: 'REDIS_UNAVAILABLE'; message: string; meta?: { dependency:
 * string; reason?: string }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'DATABASE_UNAVAILABLE':
 * // Handle DB fallback break; case 'REDIS_UNAVAILABLE': // Handle Redis fallback break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) UnavailableError.of({ errorCode:
 * 'UNAVAILABLE' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * UnavailableError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * UnavailableError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
const UnavailableError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'UnavailableError'
});

export { UnavailableError };
//# sourceMappingURL=unavailable-error.js.map
