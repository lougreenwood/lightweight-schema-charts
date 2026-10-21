import type { AppError } from '../../errors/app-error';
import type { Result } from 'true-myth';

export interface AnnotatedResultMapOpts {
  readonly error: AppError;
  readonly metadata: object;
  readonly success: unknown;
}

export type AnnotatedResultMap<TOpts extends AnnotatedResultMapOpts> =
  ReadonlyMap<
    string,
    {
      readonly metadata: TOpts['metadata'];
      readonly value: Result<TOpts['success'], TOpts['error']>;
    }
  >;
