import type { AppError } from '../errors/app-error';
import type { Task } from 'true-myth';

import { all, resolve } from 'true-myth/task';

import type {
  AnnotatedTaskMap,
  AnnotatedTaskMapOpts,
} from './annotated-task-map/types';

export type {
  AnnotatedTaskMap,
  AnnotatedTaskMapOpts,
} from './annotated-task-map/types';

/** Wraps pre-built entries into a ReadonlyMap. */
export function makeAnnotatedTaskMap<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>(
  entries: ReadonlyArray<
    readonly [
      string,
      { readonly metadata: TMetadata; readonly value: Task<TSuccess, TError> },
    ]
  >,
): AnnotatedTaskMap<{ metadata: TMetadata; success: TSuccess; error: TError }>;

/** Processes each entry through `processEntry`, chaining onto the existing Task value. */
export function makeAnnotatedTaskMap<
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedTaskMap<{
    metadata: TMetadata;
    success: TSuccess;
    error: TError;
  }>;
  readonly processEntry: (args: {
    readonly id: string;
    readonly metadata: TMetadata;
    readonly value: TSuccess;
  }) => Task<TSuccess, TError>;
}): Task<
  AnnotatedTaskMap<{ metadata: TMetadata; success: TSuccess; error: TError }>,
  TError
>;

/** Creates entries from raw keys, building each entry's Task via `createEntry`. */
export function makeAnnotatedTaskMap<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly createEntry: (key: TKey) => Task<TSuccess, TError>;
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly keys: ReadonlyArray<TKey>;
}): Task<
  AnnotatedTaskMap<{ metadata: TMetadata; success: TSuccess; error: TError }>,
  TError
>;

/** Creates entries from raw keys, building each entry's Task via `processEntry` sequentially. */
export function makeAnnotatedTaskMap<
  const TKey extends string,
  const TMetadata extends object,
  const TSuccess,
  const TError extends AppError,
>({
  createMetadata,
  keys,
  processEntry,
}: {
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly keys: ReadonlyArray<TKey>;
  readonly processEntry: (key: TKey) => Task<TSuccess, TError>;
}): Task<
  AnnotatedTaskMap<{ metadata: TMetadata; success: TSuccess; error: TError }>,
  never
>;

export function makeAnnotatedTaskMap(
  arg:
    | ReadonlyArray<
        readonly [
          string,
          {
            readonly metadata: object;
            readonly value: Task<unknown, AppError>;
          },
        ]
      >
    | {
        readonly entries: AnnotatedTaskMap<{
          metadata: object;
          success: unknown;
          error: AppError;
        }>;
        readonly processEntry: (args: {
          readonly id: string;
          readonly metadata: object;
          readonly value: unknown;
        }) => Task<unknown, AppError>;
      }
    | {
        readonly keys: ReadonlyArray<string>;
        readonly createMetadata: (key: string) => object;
        readonly createEntry: (key: string) => Task<unknown, AppError>;
      }
    | {
        readonly createMetadata: (key: string) => object;
        readonly keys: ReadonlyArray<string>;
        readonly processEntry: (key: string) => Task<unknown, AppError>;
      },
):
  | AnnotatedTaskMap<{ metadata: object; success: unknown; error: AppError }>
  | Task<
      AnnotatedTaskMap<{ metadata: object; success: unknown; error: AppError }>,
      AppError
    > {
  if (Array.isArray(arg)) {
    return new Map(arg);
  }

  if ('processEntry' in arg) {
    if ('entries' in arg) {
      const { entries, processEntry } = arg as {
        readonly entries: AnnotatedTaskMap<{
          metadata: object;
          success: unknown;
          error: AppError;
        }>;
        readonly processEntry: (args: {
          readonly id: string;
          readonly metadata: object;
          readonly value: unknown;
        }) => Task<unknown, AppError>;
      };
      return [...entries.entries()]
        .reduce<
          Task<
            readonly (readonly [
              string,
              {
                readonly metadata: object;
                readonly value: Task<unknown, AppError>;
              },
            ])[],
            AppError
          >
        >(
          (chain, [id, entry]) =>
            chain.andThen((results) =>
              resolve([
                ...results,
                [
                  id,
                  {
                    metadata: entry.metadata,
                    value: entry.value.andThen((value) =>
                      processEntry({ id, metadata: entry.metadata, value }),
                    ),
                  },
                ],
              ] as const),
            ),
          resolve(
            [] as readonly (readonly [
              string,
              {
                readonly metadata: object;
                readonly value: Task<unknown, AppError>;
              },
            ])[],
          ),
        )
        .map((entries) => new Map(entries)) as Task<
        AnnotatedTaskMap<{
          metadata: object;
          success: unknown;
          error: AppError;
        }>,
        AppError
      >;
    }

    const { createMetadata, keys, processEntry } = arg as {
      readonly createMetadata: (key: string) => object;
      readonly keys: ReadonlyArray<string>;
      readonly processEntry: (key: string) => Task<unknown, AppError>;
    };
    return keys
      .reduce<
        Task<
          readonly (readonly [
            string,
            {
              readonly metadata: object;
              readonly value: Task<unknown, AppError>;
            },
          ])[],
          AppError
        >
      >(
        (chain, key) =>
          chain.andThen((results) =>
            resolve([
              ...results,
              [
                key,
                { metadata: createMetadata(key), value: processEntry(key) },
              ],
            ] as const),
          ),
        resolve(
          [] as readonly (readonly [
            string,
            {
              readonly metadata: object;
              readonly value: Task<unknown, AppError>;
            },
          ])[],
        ),
      )
      .map((entries) => new Map(entries)) as Task<
      AnnotatedTaskMap<{ metadata: object; success: unknown; error: AppError }>,
      AppError
    >;
  }

  const { createMetadata, createEntry, keys } = arg as {
    readonly createEntry: (key: string) => Task<unknown, AppError>;
    readonly createMetadata: (key: string) => object;
    readonly keys: ReadonlyArray<string>;
  };
  return all(keys.map(createEntry)).map(
    (values) =>
      new Map(
        keys.map(
          (key, i) =>
            [key, { metadata: createMetadata(key), value: values[i] }] as const,
        ),
      ),
  ) as Task<
    AnnotatedTaskMap<{ metadata: object; success: unknown; error: AppError }>,
    AppError
  >;
}
