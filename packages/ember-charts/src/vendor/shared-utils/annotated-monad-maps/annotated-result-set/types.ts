import type { AppErrorArgs } from '../../errors/app-error';
import type { AppError } from '../../errors/app-error';
import type { Result } from 'true-myth';

export interface AnnotatedResultSetOpts {
  readonly error: AppError<AppErrorArgs & AppErrorArgs>;
  readonly metadata: object;
  readonly success: unknown;
}

export type AnnotatedResultSet<TOpts extends AnnotatedResultSetOpts> =
  ReadonlySet<{
    readonly metadata: TOpts['metadata'];
    readonly value: Result<TOpts['success'], TOpts['error']>;
  }>;
