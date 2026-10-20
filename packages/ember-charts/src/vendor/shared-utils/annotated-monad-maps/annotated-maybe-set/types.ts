import type { Maybe } from 'true-myth';

export interface AnnotatedMaybeSetOpts {
  readonly metadata: object;
  readonly value: {};
}

export type AnnotatedMaybeSet<TOpts extends AnnotatedMaybeSetOpts> =
  ReadonlySet<{
    readonly metadata: TOpts['metadata'];
    readonly value: Maybe<TOpts['value']>;
  }>;
