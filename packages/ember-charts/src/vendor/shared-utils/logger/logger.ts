import type { ClassLike } from './types';
import type pino from 'pino';

/**
 * Enhanced Pino logger with `makeChildLogger`.
 *
 * This is a `pino.Logger` with an attached `makeChildLogger` method for creating namespaced child loggers with
 * `[contextId]` message prefixes. Fastify accepts this because it IS a real Pino logger.
 */
export type AppLogger = pino.Logger & {
  makeChildLogger: <T extends string>(
    args: { namespace: T } | { self: ClassLike<T> },
  ) => AppLogger;
};

/**
 * Create a namespaced child logger from a Pino logger.
 *
 * @returns A Pino logger with `[contextId]` message prefix and `makeChildLogger`
 */
export function buildApplicationLogger({
  contextId,
  logger,
}: {
  contextId: string;
  logger: pino.Logger;
}): AppLogger {
  const appLogger = logger.child(
    {},
    { msgPrefix: `[${contextId}] ` },
  ) as AppLogger;
  appLogger.makeChildLogger = (
    args: { namespace: string } | { self: ClassLike<string> },
  ): AppLogger => {
    const name =
      'namespace' in args
        ? args.namespace
        : (args.self?.constructor?.name ?? 'Anonymous');
    return buildApplicationLogger({ contextId: name, logger });
  };
  return appLogger;
}
