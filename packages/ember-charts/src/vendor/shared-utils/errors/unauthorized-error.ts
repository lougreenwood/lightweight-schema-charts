import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from '#src/vendor/shared-utils/errors/app-error';

/**
 * UnauthorizedError instance type - use this in type positions.
 *
 * @example Type InvalidApiKeyError = UnauthorizedError<{ errorCode: 'INVALID_API_KEY'; message: string; meta?: {
 * operation?: string }; }>;
 */
export type UnauthorizedError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'UnauthorizedError';
  }>;

/**
 * Generic error for when caller lacks permission or credentials for an operation.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for API key missing/invalid, wallet signature failures, or insufficient permissions.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type InvalidApiKeyError = UnauthorizedError<{
 * errorCode: 'INVALID_API_KEY'; meta: { operation?: string }; }>;
 *
 * // Use in function return type function fetchPrivateData(): Result<Data, InvalidApiKeyError> { return Result.err(
 * UnauthorizedError.of({ errorCode: 'INVALID_API_KEY', message: 'Invalid API key provided', meta: { operation:
 * 'fetchPrivateData' }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type MissingSignatureError = UnauthorizedError<{
 * errorCode: 'MISSING_SIGNATURE'; message: string; meta?: { operation?: string }; }>; type PermissionDeniedError =
 * UnauthorizedError<{ errorCode: 'PERMISSION_DENIED'; message: string; meta?: { operation?: string }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'MISSING_SIGNATURE': //
 * Handle missing wallet signature break; case 'PERMISSION_DENIED': // Handle insufficient permissions break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) UnauthorizedError.of({ errorCode:
 * 'UNAUTHORIZED' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * UnauthorizedError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * UnauthorizedError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const UnauthorizedError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'UnauthorizedError',
});
