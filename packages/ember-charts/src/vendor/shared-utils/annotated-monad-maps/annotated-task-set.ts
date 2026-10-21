import type { AppErrorArgs } from '../errors/app-error';
import type { AnnotatedTaskSet } from './annotated-task-set/types';
import type { AppError } from '../errors/app-error';
import type { Task } from 'true-myth';

import { all, resolve } from 'true-myth/task';

export type {
  AnnotatedTaskSet,
  AnnotatedTaskSetOpts,
} from './annotated-task-set/types';

/** Wraps pre-built entries into a ReadonlySet. */
export function makeAnnotatedTaskSet<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>(
  entries: ReadonlyArray<{
    readonly metadata: TMetadata;
    readonly value: Task<TSuccess, TError>;
  }>,
): AnnotatedTaskSet<{ error: TError; metadata: TMetadata; success: TSuccess }>;
/** Processes each entry through `processEntry`, chaining onto the existing Task value. */
export function makeAnnotatedTaskSet<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedTaskSet<{
    error: TError;
    metadata: TMetadata;
    success: TSuccess;
  }>;
  readonly processEntry: (args: {
    readonly metadata: TMetadata;
    readonly value: TSuccess;
  }) => Task<TSuccess, TError>;
}): Task<
  AnnotatedTaskSet<{ error: TError; metadata: TMetadata; success: TSuccess }>,
  TError
>;
/** Creates entries from raw keys, building each entry's Task via `createEntry`. */
export function makeAnnotatedTaskSet<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly keys: ReadonlyArray<TKey>;
  readonly createEntry: (key: TKey) => Task<TSuccess, TError>;
  readonly createMetadata: (key: TKey) => TMetadata;
}): Task<
  AnnotatedTaskSet<{ error: TError; metadata: TMetadata; success: TSuccess }>,
  TError
>;
/** Creates entries from raw keys, building each entry's Task via `processEntry` sequentially. */
export function makeAnnotatedTaskSet<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError<AppErrorArgs & AppErrorArgs>,
>({
  createMetadata,
  keys,
  processEntry,
}: {
  readonly keys: ReadonlyArray<TKey>;
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly processEntry: (key: TKey) => Task<TSuccess, TError>;
}): Task<
  AnnotatedTaskSet<{ error: TError; metadata: TMetadata; success: TSuccess }>,
  never
>;
export function makeAnnotatedTaskSet(
  arg:
    | ReadonlyArray<{
        readonly metadata: object;
        readonly value: Task<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
      }>
    | {
        readonly entries: AnnotatedTaskSet<{
          error: AppError<AppErrorArgs & AppErrorArgs>;
          metadata: object;
          success: unknown;
        }>;
        readonly processEntry: (args: {
          readonly metadata: object;
          readonly value: unknown;
        }) => Task<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
      }
    | {
        readonly keys: ReadonlyArray<string>;
        readonly createEntry: (
          key: string,
        ) => Task<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
        readonly createMetadata: (key: string) => object;
      }
    | {
        readonly keys: ReadonlyArray<string>;
        readonly createMetadata: (key: string) => object;
        readonly processEntry: (
          key: string,
        ) => Task<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
      },
):
  | AnnotatedTaskSet<{
      error: AppError<AppErrorArgs & AppErrorArgs>;
      metadata: object;
      success: unknown;
    }>
  | Task<
      AnnotatedTaskSet<{
        error: AppError<AppErrorArgs & AppErrorArgs>;
        metadata: object;
        success: unknown;
      }>,
      AppError<AppErrorArgs & AppErrorArgs>
    > {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }

  if ('processEntry' in arg) {
    if ('entries' in arg) {
      const { entries, processEntry } = arg;
      return [...entries]
        .reduce<
          Task<
            readonly {
              readonly metadata: object;
              readonly value: Task<
                unknown,
                AppError<AppErrorArgs & AppErrorArgs>
              >;
            }[],
            AppError<AppErrorArgs & AppErrorArgs>
          >
        >(
          (chain, entry) =>
            chain.andThen((results) =>
              resolve([
                ...results,
                {
                  metadata: entry.metadata,
                  value: entry.value.andThen((value) =>
                    processEntry({ metadata: entry.metadata, value }),
                  ),
                },
              ] as const),
            ),
          resolve(
            [] as readonly {
              readonly metadata: object;
              readonly value: Task<
                unknown,
                AppError<AppErrorArgs & AppErrorArgs>
              >;
            }[],
          ),
        )
        .map((entries) => new Set(entries));
    }

    const { createMetadata, keys, processEntry } = arg;
    return keys
      .reduce<
        Task<
          readonly {
            readonly metadata: object;
            readonly value: Task<
              unknown,
              AppError<AppErrorArgs & AppErrorArgs>
            >;
          }[],
          AppError<AppErrorArgs & AppErrorArgs>
        >
      >(
        (chain, key) =>
          chain.andThen((results) =>
            resolve([
              ...results,
              { metadata: createMetadata(key), value: processEntry(key) },
            ] as const),
          ),
        resolve(
          [] as readonly {
            readonly metadata: object;
            readonly value: Task<
              unknown,
              AppError<AppErrorArgs & AppErrorArgs>
            >;
          }[],
        ),
      )
      .map((entries) => new Set(entries));
  }

  const { createEntry, createMetadata, keys } = arg as {
    readonly keys: ReadonlyArray<string>;
    readonly createEntry: (
      key: string,
    ) => Task<unknown, AppError<AppErrorArgs & AppErrorArgs>>;
    readonly createMetadata: (key: string) => object;
  };
  return all(keys.map(createEntry)).map(
    (values) =>
      new Set(
        keys.map(
          (key, i) =>
            ({ metadata: createMetadata(key), value: values[i] }) as const,
        ),
      ),
  ) as unknown as Task<
    AnnotatedTaskSet<{
      error: AppError<AppErrorArgs & AppErrorArgs>;
      metadata: object;
      success: unknown;
    }>,
    AppError<AppErrorArgs & AppErrorArgs>
  >;
}
