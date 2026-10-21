import type { AppErrorArgs } from '../../errors/app-error';
import type { AppError } from '../../errors/app-error';
import type { Task } from 'true-myth';

/**
 * Options for {@link AnnotatedTaskMap} — complete specification required.
 *
 * @template metadata - Per-entry metadata shape
 * @template success - Task success type
 * @template error - Task error type (must extend AppError)
 */
export interface AnnotatedTaskMapOpts {
  readonly error: AppError<AppErrorArgs & AppErrorArgs>;
  readonly metadata: object;
  readonly success: unknown;
}

/**
 * Map of metadata-annotated Task values.
 * Entries are read-only after construction — use {@link makeAnnotatedTaskMap}
 * to build instances.
 */
export type AnnotatedTaskMap<TOpts extends AnnotatedTaskMapOpts> = ReadonlyMap<
  string,
  {
    readonly metadata: TOpts['metadata'];
    readonly value: Task<TOpts['success'], TOpts['error']>;
  }
>;
