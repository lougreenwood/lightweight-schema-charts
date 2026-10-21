import type { AppErrorArgs } from './app-error';
import type { AppError } from './app-error';
import type { PreconditionError } from './precondition-error';

import { PreconditionError as PreconditionErrorClass } from './precondition-error';

/**
 * Generic builder error wrapper for static create() methods.
 *
 * Wraps underlying errors (config validation, initialization failures, etc.) in a PreconditionError with:
 *
 * - Human-readable top-level message describing what failed to build
 * - Strongly-typed `cause` field containing the union of all possible underlying errors
 * - ErrorGroup set to 'builder_precondition' for secondary discrimination
 * - Optional meta for additional context specific to this builder
 *
 * This pattern ensures builder failures are:
 *
 * - Immediately recognizable (unique errorCode per builder)
 * - Debuggable (structured cause with all context)
 * - Statically analyzable (TypeScript knows all possible causes)
 * - Groupable (errorGroup allows discriminating all builder errors as a category)
 *
 * @example
 *
 * ```typescript
 * type NetworkSchedulerCreateError = BuilderPreconditionError<{
 *   errorCode: 'NETWORK_SCHEDULER_CREATE_FAILED';
 *   message: string;
 *   cause: BuildNetworkSchedulerConfigError;
 * }>;
 *
 * // Usage in error creation:
 * return buildNetworkSchedulerConfig({ store }).mapErr((cause) =>
 *   createBuilderError({
 *     errorCode: 'NETWORK_SCHEDULER_CREATE_FAILED',
 *     message: 'Failed to create NetworkRequestScheduler: configuration build failed',
 *     cause, // Typed as BuildNetworkSchedulerConfigError
 *   })
 * );
 *
 * // At call site, can discriminate by group first:
 * result.mapErr((error) => {
 *   if (error.errorGroup === 'builder_precondition') {
 *     // It's a builder error - discriminate by specific errorCode
 *     switch (error.errorCode) {
 *       case 'NETWORK_SCHEDULER_CREATE_FAILED':
 *         const cause = error.cause as BuildNetworkSchedulerConfigError;
 *         // TypeScript knows cause is one of the config validation errors
 *         break;
 *     }
 *   }
 * });
 * ```;
 * ```
 *
 * @template TErrorArgs - Fully resolved builder error arguments
 */
export type BuilderPreconditionError<
  TErrorArgs extends BuilderPreconditionErrorArgs,
> = PreconditionError<{
  errorCode: TErrorArgs['errorCode'];
  errorGroup: 'builder_precondition';
  message: TErrorArgs['message'];
  meta: TErrorArgs['meta'];
}> & {
  cause: TErrorArgs['cause'];
};

/**
 * Base arguments for BuilderPreconditionError.
 */
export interface BuilderPreconditionErrorArgs {
  cause: AppError<AppErrorArgs>;
  errorCode: string;
  message: string;
  meta: object | undefined;
}

/**
 * Factory function to create BuilderPreconditionError instances.
 *
 * This eliminates the need to import PreconditionError everywhere and automatically sets errorGroup to
 * 'builder_precondition' for secondary discrimination.
 *
 * @example
 *
 * ```typescript
 * return buildNetworkSchedulerConfig({ store }).mapErr((cause) =>
 *   createBuilderError({
 *     errorCode: 'NETWORK_SCHEDULER_CREATE_FAILED',
 *     message: 'Failed to create NetworkRequestScheduler: configuration build failed',
 *     cause,
 *   })
 * );
 * ```;
 * ```
 *
 * @template TErrorCode - Unique literal errorCode for this builder @template TCause - Union type of all errors that can
 * cause this builder to fail @template TMeta - Optional metadata type
 */
export function createBuilderError<
  const TErrorCode extends string,
  const TCause extends AppError<AppErrorArgs>,
  const TMeta extends object | undefined,
>({
  cause,
  errorCode,
  message,
  meta,
}: {
  cause: TCause;
  errorCode: TErrorCode;
  message: string;
  meta?: TMeta;
}): BuilderPreconditionError<{
  cause: TCause;
  errorCode: TErrorCode;
  message: string;
  meta: TMeta extends object ? TMeta : object | undefined;
}> {
  return PreconditionErrorClass.of({
    cause,
    errorCode,
    errorGroup: 'builder_precondition',
    message,
    ...(meta !== undefined ? { meta } : {}),
  }) as BuilderPreconditionError<{
    cause: TCause;
    errorCode: TErrorCode;
    message: string;
    meta: TMeta extends object ? TMeta : object | undefined;
  }>;
}
