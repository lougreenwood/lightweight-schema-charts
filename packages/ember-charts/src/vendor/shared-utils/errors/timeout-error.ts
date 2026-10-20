import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from '#src/vendor/shared-utils/errors/app-error';

/**
 * TimeoutError instance type - use this in type positions.
 *
 * @example Type FetchTimeoutError = TimeoutError<{ errorCode: 'FETCH_TIMEOUT'; message: string; meta?: { operation:
 * string; timeoutMs: number }; }>;
 */
export type TimeoutError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'TimeoutError';
  }>;

/**
 * Generic error for when an operation exceeded its allowed duration.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for fetch timeouts, transaction confirmation timeouts, or any operation that takes too long.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type FetchTimeoutError = TimeoutError<{ errorCode:
 * 'FETCH_TIMEOUT'; meta: { operation: 'fetchTradingPairs'; timeoutMs: number }; }>;
 *
 * // Use in function return type function fetchTradingPairs(): Result<Data, FetchTimeoutError> { return Result.err(
 * TimeoutError.of({ errorCode: 'FETCH_TIMEOUT', message: 'fetchTradingPairs timed out after 30000ms', meta: {
 * operation: 'fetchTradingPairs', timeoutMs: 30000 }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type ConfirmTransactionTimeout = TimeoutError<{
 * errorCode: 'CONFIRM_TX_TIMEOUT'; message: string; meta?: { operation: string; timeoutMs: number }; }>; type
 * FetchUserTimeout = TimeoutError<{ errorCode: 'FETCH_USER_TIMEOUT'; message: string; meta?: { operation: string;
 * timeoutMs: number }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'CONFIRM_TX_TIMEOUT':
 * // Handle transaction confirmation timeout break; case 'FETCH_USER_TIMEOUT': // Handle user fetch timeout break; } },
 * });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) TimeoutError.of({ errorCode: 'TIMEOUT'
 * }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * TimeoutError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * TimeoutError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const TimeoutError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'TimeoutError',
});
