import type { AppErrorArgs, AppErrorOptions, GenericErrorArgs, MaybeHasLogger } from './app-error/types';
import type { LogSeverity } from '../logger/types';
export type { AppErrorArgs, AppErrorOptions, GenericErrorArgs, } from './app-error/types';
export type AppErrorLike = {
    readonly errorCode: string;
    readonly errorGroup?: string | undefined;
    readonly message: string;
    readonly meta?: object | undefined;
    readonly name: string;
    readonly severity: LogSeverity;
    readonly stack?: string | undefined;
    readonly type: string;
};
export type GenericErrorInstance<TOpts extends {
    errorCode: string;
    errorGroup?: string | undefined;
    message: string;
    meta?: object | undefined;
    type: string;
}> = AppError<{
    errorCode: TOpts['errorCode'];
    errorGroup?: TOpts['errorGroup'];
    meta?: TOpts['meta'];
    type: TOpts['type'];
} & AppErrorArgs & {
    errorCode: TOpts['errorCode'];
    errorGroup?: TOpts['errorGroup'];
    meta?: TOpts['meta'];
    type: TOpts['type'];
}>;
export declare abstract class AppError<const TErrorArgs extends AppErrorArgs> extends Error implements AppErrorLike {
    readonly errorCode: TErrorArgs['errorCode'];
    readonly errorGroup: TErrorArgs['errorGroup'];
    readonly meta: TErrorArgs['meta'];
    readonly severity: LogSeverity;
    readonly type: TErrorArgs['type'];
    get name(): string;
    constructor(messageOrOptions: string | {
        cause?: unknown;
        context?: MaybeHasLogger;
        emitLog: boolean;
        errorCode: TErrorArgs['errorCode'];
        errorGroup: TErrorArgs['errorGroup'];
        message: string;
        meta: TErrorArgs['meta'];
        severity: LogSeverity;
        type: TErrorArgs['type'];
    }, options?: AppErrorOptions & {
        emitLog: boolean;
        errorCode: TErrorArgs['errorCode'];
        errorGroup: TErrorArgs['errorGroup'];
        meta: TErrorArgs['meta'];
        severity: LogSeverity;
        type: TErrorArgs['type'];
    });
    toJSON(): {
        cause: unknown;
        errorCode: TErrorArgs["errorCode"];
        errorGroup: TErrorArgs["errorGroup"];
        message: string;
        meta: TErrorArgs["meta"];
        name: string;
        severity: LogSeverity;
        type: TErrorArgs["type"];
    };
}
export declare function createAppError<const TType extends string>({ defaultEmitLog, defaultSeverity, type, }: {
    defaultEmitLog?: boolean;
    defaultSeverity?: LogSeverity;
    type: TType;
}): {
    new <const TErrorArgs extends GenericErrorArgs & Partial<AppErrorArgs>>(options: {
        cause?: unknown;
        context?: MaybeHasLogger;
        emitLog?: boolean;
        errorCode: TErrorArgs["errorCode"];
        errorGroup?: TErrorArgs["errorGroup"];
        message: string;
        meta?: TErrorArgs["meta"];
        severity?: LogSeverity;
    }): {
        readonly errorCode: (AppErrorArgs & TErrorArgs)["errorCode"];
        readonly errorGroup: (AppErrorArgs & TErrorArgs)["errorGroup"];
        readonly meta: (AppErrorArgs & TErrorArgs)["meta"];
        readonly severity: LogSeverity;
        readonly type: (AppErrorArgs & TErrorArgs)["type"];
        readonly name: string;
        toJSON(): {
            cause: unknown;
            errorCode: (AppErrorArgs & TErrorArgs)["errorCode"];
            errorGroup: (AppErrorArgs & TErrorArgs)["errorGroup"];
            message: string;
            meta: (AppErrorArgs & TErrorArgs)["meta"];
            name: string;
            severity: LogSeverity;
            type: (AppErrorArgs & TErrorArgs)["type"];
        };
        message: string;
        stack?: string;
        cause?: unknown;
    };
    of<const TErrorCode extends string, const TMessage extends string, const TMeta extends object | undefined, const TErrorGroup extends string | undefined>(options: {
        cause?: unknown;
        context?: MaybeHasLogger;
        emitLog?: boolean;
        errorCode: TErrorCode;
        errorGroup?: TErrorGroup;
        message: TMessage;
        meta?: TMeta;
        severity?: LogSeverity;
    }): GenericErrorInstance<{
        errorCode: TErrorCode;
        errorGroup: TErrorGroup;
        message: TMessage;
        meta: TMeta;
        type: TType;
    }>;
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
    stackTraceLimit: number;
};
//# sourceMappingURL=app-error.d.ts.map