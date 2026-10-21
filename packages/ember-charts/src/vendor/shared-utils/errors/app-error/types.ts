import type {
  HasLogger,
  LogSeverity,
} from '../../logger/types';

export interface AppErrorArgs {
  errorCode: string;
  errorGroup?: string | undefined;
  meta?: object | undefined;
  type: string;
}

export interface AppErrorObjectArgs {
  cause: unknown;
  context: MaybeHasLogger | undefined;
  emitLog: boolean;
  errorCode: string;
  errorGroup?: string | undefined;
  message: string;
  meta?: object | undefined;
  severity: LogSeverity;
  type: string;
}

export interface AppErrorOptions {
  cause?: unknown;
  context?: MaybeHasLogger;
  emitLog?: boolean;
  severity?: LogSeverity;
}

export interface GenericErrorArgs {
  errorCode: string;
  errorGroup?: string | undefined;
  message: string;
  meta?: object | undefined;
}

export type MaybeHasLogger = Partial<HasLogger>;
