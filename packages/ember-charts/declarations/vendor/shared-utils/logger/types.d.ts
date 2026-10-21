/**
 * Class-like instance type with a constructor that has a stable, string literal name.
 */
export type ClassLike<TName extends string> = {
    readonly constructor: {
        readonly name: TName;
    };
};
/**
 * Minimal structural logger surface used by public error and diagnostic contracts.
 *
 * Keeping this narrower than the vendored Pino type prevents Pino and Node typings from entering the package's
 * published declarations.
 */
export interface LogWriter {
    debug(message: string): void;
    debug(bindings: object, message?: string): void;
    error(message: string): void;
    error(bindings: object, message?: string): void;
    fatal(message: string): void;
    fatal(bindings: object, message?: string): void;
    info(message: string): void;
    info(bindings: object, message?: string): void;
    warn(message: string): void;
    warn(bindings: object, message?: string): void;
}
/**
 * Consumer interface for components that need access to a logger.
 */
export interface HasLogger {
    readonly logger: LogWriter;
}
/**
 * Log severity levels supported by the logger system.
 */
export type LogSeverity = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
//# sourceMappingURL=types.d.ts.map