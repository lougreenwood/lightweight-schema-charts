import type {
  AnnotatedMaybeSet,
  AnnotatedMaybeSetOpts,
} from '#src/vendor/shared-utils/annotated-monad-maps/annotated-maybe-set/types';
import type { AppError } from '#src/vendor/shared-utils/errors/app-error';
import type { Maybe } from 'true-myth';
import type { Task } from 'true-myth/task';

import { just, nothing } from 'true-myth/maybe';
import { resolve } from 'true-myth/task';

export type {
  AnnotatedMaybeSet,
  AnnotatedMaybeSetOpts,
} from '#src/vendor/shared-utils/annotated-monad-maps/annotated-maybe-set/types';

/** Wraps pre-built entries into a ReadonlySet. */
export function makeAnnotatedMaybeSet<
  const TMetadata extends object,
  TValue extends {},
>(
  entries: ReadonlyArray<{
    readonly metadata: TMetadata;
    readonly value: Maybe<TValue>;
  }>,
): AnnotatedMaybeSet<{ metadata: TMetadata; value: TValue }>;
/** Processes each entry through `processEntry`, chaining onto the existing Maybe value. */
export function makeAnnotatedMaybeSet<
  const TMetadata extends object,
  TValue extends {},
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedMaybeSet<{ metadata: TMetadata; value: TValue }>;
  readonly processEntry: (args: {
    readonly metadata: TMetadata;
    readonly value: TValue;
  }) => Task<TValue, AppError>;
}): Task<AnnotatedMaybeSet<{ metadata: TMetadata; value: TValue }>, AppError>;
/** Creates entries from raw keys, building each entry's Maybe via `createEntry`. */
export function makeAnnotatedMaybeSet<
  const TKey extends string,
  const TMetadata extends object,
  TValue extends {},
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly keys: ReadonlyArray<TKey>;
  readonly createEntry: (key: TKey) => Maybe<TValue>;
  readonly createMetadata: (key: TKey) => TMetadata;
}): AnnotatedMaybeSet<{ metadata: TMetadata; value: TValue }>;
export function makeAnnotatedMaybeSet(
  arg:
    | ReadonlyArray<{
        readonly metadata: object;
        readonly value: Maybe<object>;
      }>
    | {
        readonly entries: AnnotatedMaybeSet<{
          metadata: object;
          value: object;
        }>;
        readonly processEntry: (args: {
          readonly metadata: object;
          readonly value: object;
        }) => Task<object, AppError>;
      }
    | {
        readonly keys: ReadonlyArray<string>;
        readonly createEntry: (key: string) => Maybe<object>;
        readonly createMetadata: (key: string) => object;
      },
):
  | AnnotatedMaybeSet<{ metadata: object; value: object }>
  | Task<AnnotatedMaybeSet<{ metadata: object; value: object }>, AppError> {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }

  if ('createEntry' in arg) {
    const { createEntry, createMetadata, keys } = arg;
    return new Set(
      keys.map(
        (key) =>
          ({ metadata: createMetadata(key), value: createEntry(key) }) as const,
      ),
    );
  }

  const { entries, processEntry } = arg as {
    readonly entries: AnnotatedMaybeSet<{ metadata: object; value: object }>;
    readonly processEntry: (args: {
      readonly metadata: object;
      readonly value: object;
    }) => Task<object, AppError>;
  };

  return [...entries]
    .reduce<
      Task<
        readonly { readonly metadata: object; readonly value: Maybe<object> }[],
        AppError
      >
    >(
      (chain, entry) =>
        chain.andThen((results) =>
          entry.value.match({
            Nothing: () => resolve([...results, entry] as const),
            Just: (value) =>
              processEntry({ metadata: entry.metadata, value })
                .map(
                  (newValue) =>
                    [
                      ...results,
                      { metadata: entry.metadata, value: just(newValue) },
                    ] as const,
                )
                .orElse(() =>
                  resolve([
                    ...results,
                    { metadata: entry.metadata, value: nothing() },
                  ] as const),
                ),
          }),
        ),
      resolve(
        [] as readonly {
          readonly metadata: object;
          readonly value: Maybe<object>;
        }[],
      ),
    )
    .map((entries) => new Set(entries));
}
