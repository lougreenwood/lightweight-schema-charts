import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from '#src/vendor/shared-utils/errors/app-error';

/**
 * UpstreamError instance type - use this in type positions.
 *
 * @example Type BitQueryApiError = UpstreamError<{ errorCode: 'BITQUERY_API_ERROR'; message: string; meta?: {
 * dependency: string; code?: number | string; details?: unknown }; }>;
 */
export type UpstreamError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'UpstreamError';
  }>;

/**
 * Generic error for when an external dependency returned an error we can't handle.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for BitQuery API errors, Jupiter swap failures, Solana RPC errors, or any unhandled upstream service error.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type BitQueryApiError = UpstreamError<{ errorCode:
 * 'BITQUERY_API_ERROR'; meta: { dependency: 'BitQueryAPI'; code?: number | string; details?: unknown }; }>;
 *
 * // Use in function return type function fetchPairs(): Result<Data, BitQueryApiError> { return Result.err(
 * UpstreamError.of({ errorCode: 'BITQUERY_API_ERROR', message: 'Upstream error from BitQueryAPI (code: 500)', meta: {
 * dependency: 'BitQueryAPI', code: 500, details: { message: 'Internal server error' }, }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type JupiterQuoteError = UpstreamError<{ errorCode:
 * 'JUPITER_QUOTE_ERROR'; message: string; meta?: { dependency: string; code?: number | string; details?: unknown }; }>;
 * type SolanaRpcError = UpstreamError<{ errorCode: 'SOLANA_RPC_ERROR'; message: string; meta?: { dependency: string;
 * code?: number | string; details?: unknown }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'JUPITER_QUOTE_ERROR':
 * // Handle Jupiter quote error break; case 'SOLANA_RPC_ERROR': // Handle Solana RPC error break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) UpstreamError.of({ errorCode:
 * 'UPSTREAM_ERROR' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * UpstreamError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * UpstreamError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const UpstreamError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'UpstreamError',
});
