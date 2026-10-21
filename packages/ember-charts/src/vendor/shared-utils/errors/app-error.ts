import type {
  AppErrorArgs,
  AppErrorOptions,
  GenericErrorArgs,
  MaybeHasLogger,
} from './app-error/types';
import type { LogSeverity } from '../logger/types';

export type {
  AppErrorArgs,
  AppErrorOptions,
  GenericErrorArgs,
} from './app-error/types';

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

export type GenericErrorInstance<
  TOpts extends {
    errorCode: string;
    errorGroup?: string | undefined;
    message: string;
    meta?: object | undefined;
    type: string;
  },
> = AppError<
  {
    errorCode: TOpts['errorCode'];
    errorGroup?: TOpts['errorGroup'];
    meta?: TOpts['meta'];
    type: TOpts['type'];
  } & AppErrorArgs & {
      errorCode: TOpts['errorCode'];
      errorGroup?: TOpts['errorGroup'];
      meta?: TOpts['meta'];
      type: TOpts['type'];
    }
>;

export abstract class AppError<const TErrorArgs extends AppErrorArgs>
  extends Error
  implements AppErrorLike
{
  readonly errorCode: TErrorArgs['errorCode'];
  readonly errorGroup: TErrorArgs['errorGroup'];
  readonly meta: TErrorArgs['meta'];
  readonly severity: LogSeverity;
  readonly type: TErrorArgs['type'];

  override get name(): string {
    const baseName = this.constructor.name;
    return this.errorCode ? `${baseName}::${this.errorCode}` : baseName;
  }

  constructor(
    messageOrOptions:
      | string
      | {
          cause?: unknown;
          context?: MaybeHasLogger;
          emitLog: boolean;
          errorCode: TErrorArgs['errorCode'];
          errorGroup: TErrorArgs['errorGroup'];
          message: string;
          meta: TErrorArgs['meta'];
          severity: LogSeverity;
          type: TErrorArgs['type'];
        },
    options?: AppErrorOptions & {
      emitLog: boolean;
      errorCode: TErrorArgs['errorCode'];
      errorGroup: TErrorArgs['errorGroup'];
      meta: TErrorArgs['meta'];
      severity: LogSeverity;
      type: TErrorArgs['type'];
    },
  ) {
    const normalized =
      typeof messageOrOptions === 'string'
        ? {
            cause: options?.cause,
            context: options?.context,
            emitLog: options?.emitLog ?? false,
            errorCode: options?.errorCode as TErrorArgs['errorCode'],
            errorGroup: options?.errorGroup,
            message: messageOrOptions,
            meta: options?.meta,
            severity: options?.severity ?? ('error' as const),
            type: options?.type as TErrorArgs['type'],
          }
        : messageOrOptions;

    const {
      cause,
      context,
      emitLog,
      errorCode,
      errorGroup,
      message,
      meta,
      severity,
      type,
    } = normalized;

    super(message, cause ? { cause } : undefined);

    this.type = type;
    this.errorCode = errorCode;
    this.errorGroup = errorGroup;
    this.meta = meta ?? {};
    this.severity = severity;

    if (emitLog === true) {
      const logger = context?.logger ?? console;
      const logFn = (
        logger as unknown as Record<string, (obj: object, msg: string) => void>
      )[severity];
      if (logFn) {
        logFn.call(
          logger,
          { err: this, errorCode, errorGroup, meta: this.meta, type },
          message,
        );
      } else {
        console.error(
          { err: this, errorCode, errorGroup, meta: this.meta, type },
          message,
        );
      }
    }
  }

  toJSON() {
    return {
      cause: this.cause,
      errorCode: this.errorCode,
      errorGroup: this.errorGroup,
      message: this.message,
      meta: this.meta,
      name: this.name,
      severity: this.severity,
      type: this.type,
    };
  }
}

export function createAppError<const TType extends string>({
  defaultEmitLog = true,
  defaultSeverity = 'error',
  type,
}: {
  defaultEmitLog?: boolean;
  defaultSeverity?: LogSeverity;
  type: TType;
}) {
  type ThisType = TType;

  return class<
    const TErrorArgs extends GenericErrorArgs & Partial<AppErrorArgs>,
  > extends AppError<AppErrorArgs & TErrorArgs> {
    static {
      Object.defineProperty(this, 'name', {
        configurable: true,
        enumerable: false,
        value: type,
        writable: false,
      });
    }

    static of<
      const TErrorCode extends string,
      const TMessage extends string,
      const TMeta extends object | undefined,
      const TErrorGroup extends string | undefined,
    >(options: {
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
      type: ThisType;
    }> {
      const Ctor = this as unknown as new (opts: {
        cause?: unknown;
        context?: MaybeHasLogger;
        emitLog?: boolean;
        errorCode: TErrorCode;
        message: TMessage;
        meta?: TMeta;
        severity?: LogSeverity;
      }) => unknown;

      const instance = new Ctor(options);
      return instance as GenericErrorInstance<{
        errorCode: TErrorCode;
        errorGroup: TErrorGroup;
        message: TMessage;
        meta: TMeta;
        type: ThisType;
      }>;
    }

    constructor(options: {
      cause?: unknown;
      context?: MaybeHasLogger;
      emitLog?: boolean;
      errorCode: TErrorArgs['errorCode'];
      errorGroup?: TErrorArgs['errorGroup'];
      message: string;
      meta?: TErrorArgs['meta'];
      severity?: LogSeverity;
    });

    constructor(options: {
      cause?: unknown;
      context?: MaybeHasLogger;
      emitLog?: boolean;
      errorCode: TErrorArgs['errorCode'];
      errorGroup?: TErrorArgs['errorGroup'];
      message: string;
      meta?: TErrorArgs['meta'];
      severity?: LogSeverity;
    }) {
      super({
        ...options,
        emitLog: options.emitLog ?? defaultEmitLog,
        errorGroup: options.errorGroup,
        meta: options.meta ?? {},
        severity: options.severity ?? defaultSeverity,
        type,
      });
    }
  };
}
