import { createAppError } from './app-error.js';

/**
 * InvariantViolationError instance type - use this in type positions.
 *
 * @example Type InvalidStateTransitionError = InvariantViolationError<{ errorCode: 'INVALID_STATE_TRANSITION'; message:
 * string; meta: { fromState: string; toState: string }; // Required by default }>;
 */

/**
 * Generic error for when an internal invariant or assertion failed (developer mistake).
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for unreachable code paths, broken state transitions, logic bugs, or any condition that should never occur
 * in correct code. These errors typically indicate bugs that need fixing.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type InvalidStateTransitionError =
 * InvariantViolationError<{ errorCode: 'INVALID_STATE_TRANSITION'; meta: { invariant: 'Cannot transition from Executing
 * to Idle'; details?: { fromState: string; toState: string }; }; }>;
 *
 * // Use in function return type or throw (within Result/Task contexts) function transitionState(fromState: string,
 * toState: string): Result<void, InvalidStateTransitionError> { if (fromState === 'Executing' && toState === 'Idle') {
 * return Result.err( InvariantViolationError.of({ errorCode: 'INVALID_STATE_TRANSITION', message: 'Cannot transition
 * from Executing to Idle', meta: { fromState, toState }, }), ); } return Result.ok(undefined); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type UnreachableCodePathError =
 * InvariantViolationError<{ errorCode: 'UNREACHABLE_CODE_PATH'; message: string; meta?: { details: unknown }; }>;
 *
 * Type MissingRequiredFieldError = InvariantViolationError<{ errorCode: 'MISSING_REQUIRED_FIELD'; message: string;
 * meta?: { field: string }; }>;
 *
 * // Discriminate on errorCode function handleInvariant(error: UnreachableCodePathError | MissingRequiredFieldError) {
 * switch (error.errorCode) { case 'UNREACHABLE_CODE_PATH': // Handle unreachable branch diagnostics break; case
 * 'MISSING_REQUIRED_FIELD': // Handle developer fix instructions break; } }
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) InvariantViolationError.of({ errorCode:
 * 'INVALID_STATE' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * InvariantViolationError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * InvariantViolationError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal
 * errorCode types!
 */
const InvariantViolationError = createAppError({
  // Invariants signal developer errors: log by default and use a high severity.
  defaultEmitLog: true,
  defaultSeverity: 'fatal',
  type: 'InvariantViolationError'
});

export { InvariantViolationError };
//# sourceMappingURL=invariant-violation-error.js.map
