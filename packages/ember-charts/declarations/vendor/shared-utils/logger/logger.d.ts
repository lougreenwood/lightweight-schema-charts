import type { ClassLike, LogWriter } from './types';
import type pino from 'pino';
/**
 * Enhanced Pino logger with `makeChildLogger`.
 *
 * This is a `pino.Logger` with an attached `makeChildLogger` method for creating namespaced child loggers with
 * `[contextId]` message prefixes. Fastify accepts this because it IS a real Pino logger.
 */
export type AppLogger = LogWriter & pino.Logger & {
    makeChildLogger: <T extends string>(args: {
        namespace: T;
    } | {
        self: ClassLike<T>;
    }) => AppLogger;
};
/**
 * Create a namespaced child logger from a Pino logger.
 *
 * @returns A Pino logger with `[contextId]` message prefix and `makeChildLogger`
 */
export declare function buildApplicationLogger({ contextId, logger, }: {
    contextId: string;
    logger: pino.Logger;
}): AppLogger;
//# sourceMappingURL=logger.d.ts.map