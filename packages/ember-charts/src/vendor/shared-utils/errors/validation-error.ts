import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from './app-error';

/**
 * ValidationError instance type - use this in type positions.
 *
 * @example Type InvalidEmailError = ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; meta: { email:
 * string }; // Required by default }>;
 */
export type ValidationError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'ValidationError';
  }>;

/**
 * Generic error for when validation checks fail.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * **Scope of Validation:** The scope of what constitutes a "validation error" is **context-dependent** and **relative
 * to the validator's responsibility**. Use this error ONLY when the component/function is explicitly responsible for
 * validating a specific aspect. For example:
 *
 * - A gate validator checking thresholds: threshold not met IS a validation error
 * - A parser checking format: malformed data IS a validation error
 * - A function that doesn't validate data availability: missing data is NOT a validation error
 *
 * **Ask yourself:** "Is this component's job to validate this condition?" If yes, use ValidationError. If no, the error
 * belongs elsewhere in the error taxonomy.
 *
 * Use this for validation failures including invalid input, criteria not met, thresholds not satisfied, malformed data,
 * out-of-range values, or any condition where the validator's logic determines something is unacceptable.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type InvalidEmailError =
 * ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; meta: { email: string }; // Required - TypeScript
 * enforces at call site }>;
 *
 * // Use in function return type function validateEmail(email: string): Result<string, InvalidEmailError> { if
 * (!email.includes('@')) { return Result.err( ValidationError.of({ errorCode: 'INVALID_EMAIL', message: 'Email must
 * contain @ symbol', meta: { email }, // ✅ Required - TypeScript error if omitted }), ); } return Result.ok(email); }
 *
 * @example // ✅ CORRECT: Use for threshold/criteria validation with required meta type ThresholdNotMetError =
 * ValidationError<{ errorCode: 'THRESHOLD_NOT_MET'; message: string; meta: { actual: number; threshold: number; gate:
 * string }; // Required }>;
 *
 * Function checkThreshold(value: number): Result<void, ThresholdNotMetError> { if (value < 0.8) { return Result.err(
 * ValidationError.of({ errorCode: 'THRESHOLD_NOT_MET', message: `Threshold not met: ${value} < 0.8`, meta: { actual:
 * value, threshold: 0.8, gate: 'buyPressure' }, // ✅ Required }), ); } return Result.ok(undefined); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint (no meta needed) type InvalidEmailError =
 * ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; }>; type OutOfRangeError = ValidationError<{
 * errorCode: 'OUT_OF_RANGE'; message: string; }>; type MalformedDataError = ValidationError<{ errorCode:
 * 'MALFORMED_DATA'; message: string; }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type ValidationErrors = InvalidEmailError | OutOfRangeError |
 * MalformedDataError;
 *
 * // Handle with discrimination result.match({ err: (error) => { switch (error.errorCode) { case 'INVALID_EMAIL':
 * console.log('Email validation failed:', error.message); break; case 'OUT_OF_RANGE': console.log('Value out of
 * acceptable range:', error.message); break; case 'MALFORMED_DATA': console.log('Data format is invalid:',
 * error.message); break; } }, });
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type ConfigWarning = ValidationError<{ errorCode:
 * 'CONFIG_WARNING'; message: string; meta?: { config?: string }; // Explicitly optional }>;
 *
 * ValidationError.of({ errorCode: 'CONFIG_WARNING', message: 'Config issue detected', context: { logger: myLogger }, //
 * Optional - for logging // meta is optional - can omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) ValidationError.of({ errorCode:
 * 'INVALID' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function validateEmail():
 * Result<Email, ValidationError<{ errorCode: string; message: string }>> {} // BAD - not specific! function
 * validateAge(): Result<Age, ValidationError<{ errorCode: string; message: string }>> {} // BAD - not specific! //
 * Always use literal errorCode types!
 */
export const ValidationError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'debug', // Validation failures are often expected conditions, not system errors
  type: 'ValidationError',
});
