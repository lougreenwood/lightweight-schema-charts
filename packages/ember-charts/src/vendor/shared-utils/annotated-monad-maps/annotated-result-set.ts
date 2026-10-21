import type { AppErrorArgs } from '../errors/app-error';
import type { AppError } from '../errors/app-error';
import type { Result } from 'true-myth';

import type { AnnotatedResultSet } from './annotated-result-set/types';

export type {
  AnnotatedResultSet,
  AnnotatedResultSetOpts,
} from './annotated-result-set/types';

/** Wraps pre-built entries into a ReadonlySet. */
export function makeAnnotatedResultSet<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>(
  entries: ReadonlyArray<{
    readonly metadata: TMetadata;
    readonly value: Result<TSuccess, TError>;
  }>,
): AnnotatedResultSet<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

/** Processes each entry through `processEntry`, chaining onto the existing Result value. */
export function makeAnnotatedResultSet<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedResultSet<{
    metadata: TMetadata;
    success: TSuccess;
    error: TError;
  }>;
  readonly processEntry: (args: {
    readonly metadata: TMetadata;
    readonly value: TSuccess;
  }) => Result<TSuccess, TError>;
}): AnnotatedResultSet<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

/** Creates entries from raw keys, building each entry's Result via `createEntry`. */
export function makeAnnotatedResultSet<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly createEntry: (key: TKey) => Result<TSuccess, TError>;
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly keys: ReadonlyArray<TKey>;
}): AnnotatedResultSet<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

export function makeAnnotatedResultSet(
  arg:
    | ReadonlyArray<{
        readonly metadata: object;
        readonly value: Result<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
      }>
    | {
        readonly entries: AnnotatedResultSet<{
          metadata: object;
          success: unknown;
          error: AppError<AppErrorArgs & AppErrorArgs>;
        }>;
        readonly processEntry: (args: {
          readonly metadata: object;
          readonly value: unknown;
        }) => Result<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
      }
    | {
        readonly createEntry: (
          key: string,
        ) => Result<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
        readonly createMetadata: (key: string) => object;
        readonly keys: ReadonlyArray<string>;
      },
): AnnotatedResultSet<{
  metadata: object;
  success: unknown;
  error: AppError<AppErrorArgs & AppErrorArgs>;
}> {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }

  if ('entries' in arg) {
    const { entries, processEntry } = arg as {
      readonly entries: AnnotatedResultSet<{
        metadata: object;
        success: unknown;
        error: AppError<AppErrorArgs & AppErrorArgs>;
      }>;
      readonly processEntry: (args: {
        readonly metadata: object;
        readonly value: unknown;
      }) => Result<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
    };
    return new Set(
      [...entries].map(
        (entry) =>
          ({
            metadata: entry.metadata,
            value: entry.value.andThen((value) =>
              processEntry({ metadata: entry.metadata, value }),
            ),
          }) as const,
      ),
    );
  }

  const { createEntry, createMetadata, keys } = arg as {
    readonly createEntry: (
      key: string,
    ) => Result<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
    readonly createMetadata: (key: string) => object;
    readonly keys: ReadonlyArray<string>;
  };
  return new Set(
    keys.map(
      (key) =>
        ({ metadata: createMetadata(key), value: createEntry(key) }) as const,
    ),
  );
}
