import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from './app-error';

/**
 * PreconditionError instance type - use this in type positions.
 *
 * @example Type TaskPreconditionNotMetError = PreconditionError<{ errorCode: 'TASK_PRECONDITION_NOT_MET'; message:
 * string; meta: { taskId: string; reason: string }; }>;
 */
export type PreconditionError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'PreconditionError';
  }>;

/**
 * Generic error for when preconditions required for an operation are not met.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * Use this when an operation cannot proceed because necessary conditions are not satisfied. This differs from
 * ValidationError (which checks input correctness) - preconditions check system state, resource availability, or
 * dependencies required for the operation to execute.
 *
 * Examples:
 *
 * - Required resource not yet initialized
 * - Dependent service not available
 * - System state incompatible with operation
 * - Required data not loaded
 * - Prerequisites not satisfied
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type DataNotLoadedError = PreconditionError<{
 * errorCode: 'DATA_NOT_LOADED'; message: string; meta: { requiredData: string }; }>;
 *
 * Function processData(): Result<Data, DataNotLoadedError> { if (!this.isDataLoaded) { return Result.err(
 * PreconditionError.of({ errorCode: 'DATA_NOT_LOADED', message: 'Cannot process - data not yet loaded', meta: {
 * requiredData: 'userProfile' }, }), ); } return Result.ok(this.data); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type ServiceNotReadyError = PreconditionError<{
 * errorCode: 'SERVICE_NOT_READY'; message: string; meta: { service: string }; }>; type DependencyMissingError =
 * PreconditionError<{ errorCode: 'DEPENDENCY_MISSING'; message: string; meta: { dependency: string }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'SERVICE_NOT_READY':
 * console.log('Service not ready:', error.meta.service); break; case 'DEPENDENCY_MISSING': console.log('Missing
 * dependency:', error.meta.dependency); break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) PreconditionError.of({ errorCode:
 * 'NOT_READY' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function checkA(): Result<A,
 * PreconditionError<{ errorCode: string; message: string }>> {} // BAD! function checkB(): Result<B,
 * PreconditionError<{ errorCode: string; message: string }>> {} // BAD! // Always use literal errorCode types!
 */
export const PreconditionError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'warn',
  type: 'PreconditionError',
});
