import type { AppError } from '#src/vendor/shared-utils/errors/app-error';
import type { Result } from 'true-myth';

export interface AnnotatedResultSetOpts {
  readonly error: AppError;
  readonly metadata: object;
  readonly success: unknown;
}

export type AnnotatedResultSet<TOpts extends AnnotatedResultSetOpts> =
  ReadonlySet<{
    readonly metadata: TOpts['metadata'];
    readonly value: Result<TOpts['success'], TOpts['error']>;
  }>;
