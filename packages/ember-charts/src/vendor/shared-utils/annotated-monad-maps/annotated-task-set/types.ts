import type { AppError } from '#src/vendor/shared-utils/errors/app-error';
import type { Task } from 'true-myth';

export interface AnnotatedTaskSetOpts {
  readonly error: AppError;
  readonly metadata: object;
  readonly success: unknown;
}

export type AnnotatedTaskSet<TOpts extends AnnotatedTaskSetOpts> = ReadonlySet<{
  readonly metadata: TOpts['metadata'];
  readonly value: Task<TOpts['success'], TOpts['error']>;
}>;
