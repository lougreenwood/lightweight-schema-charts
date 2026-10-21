import type { Maybe } from 'true-myth';

import type {
  AnnotatedMaybeMap,
  AnnotatedMaybeMapOpts,
} from './annotated-maybe-map/types';

export type {
  AnnotatedMaybeMap,
  AnnotatedMaybeMapOpts,
} from './annotated-maybe-map/types';

/** Wraps pre-built entries into a ReadonlyMap. */
export function makeAnnotatedMaybeMap<
  const TMetadata extends object,
  const TValue extends {},
>(
  entries: ReadonlyArray<
    readonly [
      string,
      { readonly metadata: TMetadata; readonly value: Maybe<TValue> },
    ]
  >,
): AnnotatedMaybeMap<{ metadata: TMetadata; value: TValue }>;

/** Processes each entry through `processEntry`, chaining onto the existing Maybe value. */
export function makeAnnotatedMaybeMap<
  const TMetadata extends object,
  const TValue extends {},
>({
  entries,
  processEntry,
}: {
  readonly entries: AnnotatedMaybeMap<{ metadata: TMetadata; value: TValue }>;
  readonly processEntry: (args: {
    readonly id: string;
    readonly metadata: TMetadata;
    readonly value: TValue;
  }) => Maybe<TValue>;
}): AnnotatedMaybeMap<{ metadata: TMetadata; value: TValue }>;

/** Creates entries from raw keys, building each entry's Maybe via `createEntry`. */
export function makeAnnotatedMaybeMap<
  const TKey extends string,
  const TMetadata extends object,
  const TValue extends {},
>({
  createEntry,
  createMetadata,
  keys,
}: {
  readonly createEntry: (key: TKey) => Maybe<TValue>;
  readonly createMetadata: (key: TKey) => TMetadata;
  readonly keys: ReadonlyArray<TKey>;
}): AnnotatedMaybeMap<{ metadata: TMetadata; value: TValue }>;

export function makeAnnotatedMaybeMap(
  arg:
    | ReadonlyArray<
        readonly [
          string,
          { readonly metadata: object; readonly value: Maybe<object> },
        ]
      >
    | {
        readonly entries: AnnotatedMaybeMap<{
          metadata: object;
          value: object;
        }>;
        readonly processEntry: (args: {
          readonly id: string;
          readonly metadata: object;
          readonly value: object;
        }) => Maybe<object>;
      }
    | {
        readonly createEntry: (key: string) => Maybe<object>;
        readonly createMetadata: (key: string) => object;
        readonly keys: ReadonlyArray<string>;
      },
): AnnotatedMaybeMap<{ metadata: object; value: object }> {
  if (Array.isArray(arg)) {
    return new Map(arg);
  }

  if ('entries' in arg) {
    const { entries, processEntry } = arg as {
      readonly entries: AnnotatedMaybeMap<{ metadata: object; value: object }>;
      readonly processEntry: (args: {
        readonly id: string;
        readonly metadata: object;
        readonly value: object;
      }) => Maybe<object>;
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
    readonly createEntry: (key: string) => Maybe<object>;
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
