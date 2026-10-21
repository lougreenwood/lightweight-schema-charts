import { type GenericErrorArgs, type GenericErrorInstance } from './app-error';
/**
 * InvariantViolationError instance type - use this in type positions.
 *
 * @example Type InvalidStateTransitionError = InvariantViolationError<{ errorCode: 'INVALID_STATE_TRANSITION'; message:
 * string; meta: { fromState: string; toState: string }; // Required by default }>;
 */
export type InvariantViolationError<TOpts extends GenericErrorArgs> = GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'InvariantViolationError';
}>;
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
export declare const InvariantViolationError: {
    new <const TErrorArgs extends GenericErrorArgs & Partial<import("./app-error").AppErrorArgs>>(options: {
        cause?: unknown;
        context?: import("./app-error/types").MaybeHasLogger;
        emitLog?: boolean;
        errorCode: TErrorArgs["errorCode"];
        errorGroup?: TErrorArgs["errorGroup"] | undefined;
        message: string;
        meta?: TErrorArgs["meta"] | undefined;
        severity?: import("../logger/types").LogSeverity;
    }): {
        readonly errorCode: (import("./app-error").AppErrorArgs & TErrorArgs)["errorCode"];
        readonly errorGroup: (import("./app-error").AppErrorArgs & TErrorArgs)["errorGroup"];
        readonly meta: (import("./app-error").AppErrorArgs & TErrorArgs)["meta"];
        readonly severity: import("../logger/types").LogSeverity;
        readonly type: (import("./app-error").AppErrorArgs & TErrorArgs)["type"];
        readonly name: string;
        toJSON(): {
            cause: unknown;
            errorCode: (import("./app-error").AppErrorArgs & TErrorArgs)["errorCode"];
            errorGroup: (import("./app-error").AppErrorArgs & TErrorArgs)["errorGroup"];
            message: string;
            meta: (import("./app-error").AppErrorArgs & TErrorArgs)["meta"];
            name: string;
            severity: import("../logger/types").LogSeverity;
            type: (import("./app-error").AppErrorArgs & TErrorArgs)["type"];
        };
        message: string;
        stack?: string;
        cause?: unknown;
    };
    of<const TErrorCode extends string, const TMessage extends string, const TMeta extends object | undefined, const TErrorGroup extends string | undefined>(options: {
        cause?: unknown;
        context?: import("./app-error/types").MaybeHasLogger;
        emitLog?: boolean;
        errorCode: TErrorCode;
        errorGroup?: TErrorGroup | undefined;
        message: TMessage;
        meta?: TMeta | undefined;
        severity?: import("../logger/types").LogSeverity;
    }): GenericErrorInstance<{
        errorCode: TErrorCode;
        errorGroup: TErrorGroup;
        message: TMessage;
        meta: TMeta;
        type: "InvariantViolationError";
    }>;
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
    stackTraceLimit: number;
};
//# sourceMappingURL=invariant-violation-error.d.ts.map