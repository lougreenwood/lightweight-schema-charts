import type { Maybe } from 'true-myth';

export interface AnnotatedMaybeMapOpts {
  readonly metadata: object;
  readonly value: {};
}

export type AnnotatedMaybeMap<TOpts extends AnnotatedMaybeMapOpts> =
  ReadonlyMap<
    string,
    {
      readonly metadata: TOpts['metadata'];
      readonly value: Maybe<TOpts['value']>;
    }
  >;
