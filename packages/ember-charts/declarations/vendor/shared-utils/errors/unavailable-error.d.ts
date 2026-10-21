import { type GenericErrorArgs, type GenericErrorInstance } from './app-error';
/**
 * UnavailableError instance type - use this in type positions.
 *
 * @example Type BitQueryUnavailableError = UnavailableError<{ errorCode: 'BITQUERY_UNAVAILABLE'; message: string;
 * meta?: { dependency: string; reason?: string }; }>;
 */
export type UnavailableError<TOpts extends GenericErrorArgs> = GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'UnavailableError';
}>;
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
export declare const UnavailableError: {
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
        type: "UnavailableError";
    }>;
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
    stackTraceLimit: number;
};
//# sourceMappingURL=unavailable-error.d.ts.map