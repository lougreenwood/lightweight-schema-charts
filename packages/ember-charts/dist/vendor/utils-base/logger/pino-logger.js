/**
 * Minimal logger facade.
 *
 * The copied rendering code reports through a logger-shaped object. Consumers that want structured logging inject
 * their own implementation; the default writes to the console. This is a vendored support copy, recorded as a
 * decoupling item.
 */

const write = (level, args) => {
  console[level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error'](...args);
};
const logger = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
  child: () => logger
};
const pinoLogger = logger;
function makeChildLogger() {
  return logger;
}

export { pinoLogger as default, makeChildLogger, pinoLogger };
//# sourceMappingURL=pino-logger.js.map
