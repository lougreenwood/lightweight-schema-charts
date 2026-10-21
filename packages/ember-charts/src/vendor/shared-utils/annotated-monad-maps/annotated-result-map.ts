import type { AppError } from '../errors/app-error';
import type { Result } from 'true-myth';

import type {
  AnnotatedResultMap,
  AnnotatedResultMapOpts,
} from './annotated-result-map/types';

export type {
  AnnotatedResultMap,
  AnnotatedResultMapOpts,
} from './annotated-result-map/types';

/** Wraps pre-built entries into a ReadonlyMap. */
export function makeAnnotatedResultMap<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>(
  entries: ReadonlyArray<
    readonly [
      string,
      {
        readonly metadata: TMetadata;
        readonly value: Result<TSuccess, TError>;
      },
    ]
  >,
): AnnotatedResultMap<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

/** Processes each entry through `processEntry`, chaining onto the existing Result value. */
export function makeAnnotatedResultMap<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedResultMap<{
    metadata: TMetadata;
    success: TSuccess;
    error: TError;
  }>;
  readonly processEntry: (args: {
    readonly id: string;
    readonly metadata: TMetadata;
    readonly value: TSuccess;
  }) => Result<TSuccess, TError>;
}): AnnotatedResultMap<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

/** Creates entries from raw keys, building each entry's Result via `createEntry`. */
export function makeAnnotatedResultMap<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly createEntry: (key: TKey) => Result<TSuccess, TError>;
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly keys: ReadonlyArray<TKey>;
}): AnnotatedResultMap<{
  metadata: TMetadata;
  success: TSuccess;
  error: TError;
}>;

export function makeAnnotatedResultMap(
  arg:
    | ReadonlyArray<
        readonly [
          string,
          {
            readonly metadata: object;
            readonly value: Result<unknown, AppError>;
          },
        ]
      >
    | {
        readonly entries: AnnotatedResultMap<{
          metadata: object;
          success: unknown;
          error: AppError;
        }>;
        readonly processEntry: (args: {
          readonly id: string;
          readonly metadata: object;
          readonly value: unknown;
        }) => Result<unknown, AppError>;
      }
    | {
        readonly createEntry: (key: string) => Result<unknown, AppError>;
        readonly createMetadata: (key: string) => object;
        readonly keys: ReadonlyArray<string>;
      },
): AnnotatedResultMap<{ metadata: object; success: unknown; error: AppError }> {
  if (Array.isArray(arg)) {
    return new Map(arg);
  }

  if ('entries' in arg) {
    const { entries, processEntry } = arg as {
      readonly entries: AnnotatedResultMap<{
        metadata: object;
        success: unknown;
        error: AppError;
      }>;
      readonly processEntry: (args: {
        readonly id: string;
        readonly metadata: object;
        readonly value: unknown;
      }) => Result<unknown, AppError>;
    };
    return new Map(
      [...entries.entries()].map(
        ([id, entry]) =>
          [
            id,
            {
              metadata: entry.metadata,
              value: entry.value.andThen((value) =>
                processEntry({ id, metadata: entry.metadata, value }),
              ),
            },
          ] as const,
      ),
    );
  }

  const { createEntry, createMetadata, keys } = arg as {
    readonly createEntry: (key: string) => Result<unknown, AppError>;
    readonly createMetadata: (key: string) => object;
    readonly keys: ReadonlyArray<string>;
  };
  return new Map(
    keys.map(
      (key) =>
        [
          key,
          { metadata: createMetadata(key), value: createEntry(key) },
        ] as const,
    ),
  );
}
