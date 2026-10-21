/**
 * Minimal logger facade.
 *
 * The copied rendering code reports through a logger-shaped object. Consumers that want structured logging inject
 * their own implementation; the default writes to the console. This is a vendored support copy, recorded as a
 * decoupling item.
 */
export type AppLogger = Readonly<{
    debug: (...args: readonly unknown[]) => void;
    info: (...args: readonly unknown[]) => void;
    warn: (...args: readonly unknown[]) => void;
    error: (...args: readonly unknown[]) => void;
    child: (bindings: Readonly<Record<string, unknown>>) => AppLogger;
}>;
export declare const pinoLogger: Readonly<{
    debug: (...args: readonly unknown[]) => void;
    info: (...args: readonly unknown[]) => void;
    warn: (...args: readonly unknown[]) => void;
    error: (...args: readonly unknown[]) => void;
    child: (bindings: Readonly<Record<string, unknown>>) => AppLogger;
}>;
export declare function makeChildLogger(): AppLogger;
export default pinoLogger;
//# sourceMappingURL=pino-logger.d.ts.map