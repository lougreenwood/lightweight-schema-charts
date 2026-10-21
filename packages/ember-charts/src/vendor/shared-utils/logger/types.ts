import type { AppLogger } from './logger';

/**
 * Class-like instance type with a constructor that has a stable, string literal name.
 */
export type ClassLike<TName extends string = string> = {
  readonly constructor: { readonly name: TName };
};

/**
 * Consumer interface for components that need access to a logger.
 */
export interface HasLogger {
  readonly logger: AppLogger;
}

/**
 * Log severity levels supported by the logger system.
 */
export type LogSeverity = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
