import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from '#src/vendor/shared-utils/errors/app-error';

/**
 * NotFoundError instance type - use this in type positions.
 *
 * @example Type UserNotFoundError = NotFoundError<{ errorCode: 'USER_NOT_FOUND'; message: string; meta: { userId:
 * string }; // Required by default }>;
 */
export type NotFoundError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'NotFoundError';
  }>;

/**
 * Generic error for when a requested resource doesn't exist.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type UserNotFoundError = NotFoundError<{
 * errorCode: 'USER_NOT_FOUND'; message: string; meta: { userId: string }; // Required - TypeScript enforces at call
 * site }>;
 *
 * // Use in function return type function getUser(id: string): Result<User, UserNotFoundError> { return Result.err(
 * NotFoundError.of({ errorCode: 'USER_NOT_FOUND', message: 'User not found in database', meta: { userId: id }, // ✅
 * Required - TypeScript error if omitted }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type UserNotFoundError = NotFoundError<{ errorCode:
 * 'USER_NOT_FOUND'; message: string }>; type PostNotFoundError = NotFoundError<{ errorCode: 'POST_NOT_FOUND'; message:
 * string }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type ContentErrors = UserNotFoundError | PostNotFoundError;
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type OptionalMetaError = NotFoundError<{ errorCode:
 * 'RESOURCE_NOT_FOUND'; message: string; meta?: { resourceId?: string }; // Explicitly optional }>;
 *
 * NotFoundError.of({ errorCode: 'RESOURCE_NOT_FOUND', message: 'Resource not found', context: { logger: myLogger }, //
 * Optional - for logging // meta is optional - can omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) NotFoundError.of({ errorCode:
 * 'USER_NOT_FOUND' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function getUser(): Result<User,
 * NotFoundError<{ errorCode: string; message: string }>> {} // BAD - not specific! function getPost(): Result<Post,
 * NotFoundError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const NotFoundError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'warn',
  type: 'NotFoundError',
});
