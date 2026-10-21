/**
 * Enhanced Pino logger with `makeChildLogger`.
 *
 * This is a `pino.Logger` with an attached `makeChildLogger` method for creating namespaced child loggers with
 * `[contextId]` message prefixes. Fastify accepts this because it IS a real Pino logger.
 */

/**
 * Create a namespaced child logger from a Pino logger.
 *
 * @returns A Pino logger with `[contextId]` message prefix and `makeChildLogger`
 */
function buildApplicationLogger({
  contextId,
  logger
}) {
  const appLogger = logger.child({}, {
    msgPrefix: `[${contextId}] `
  });
  appLogger.makeChildLogger = args => {
    const name = 'namespace' in args ? args.namespace : args.self?.constructor?.name ?? 'Anonymous';
    return buildApplicationLogger({
      contextId: name,
      logger
    });
  };
  return appLogger;
}

export { buildApplicationLogger };
//# sourceMappingURL=logger.js.map
