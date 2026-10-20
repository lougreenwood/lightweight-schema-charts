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

const write = (level: string, args: readonly unknown[]): void => {
  console[
    level === 'debug'
      ? 'debug'
      : level === 'info'
        ? 'info'
        : level === 'warn'
          ? 'warn'
          : 'error'
  ](...args);
};

const logger: AppLogger = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
  child: () => logger,
};

export const pinoLogger = logger;
export function makeChildLogger(): AppLogger {
  return logger;
}

export default pinoLogger;
