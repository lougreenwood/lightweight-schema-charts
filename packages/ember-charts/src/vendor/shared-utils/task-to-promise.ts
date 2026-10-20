import type { Task } from 'true-myth/task';

/**
 * Convert a {@link Task} to a native {@link Promise}.
 *
 * Unlike `task.toPromise()` which returns `Promise<Result<T, E>>` (always resolves),
 * this utility returns `Promise<T>` with standard Promise rejection semantics:
 *
 * | Task state | Result variant | Promise outcome |
 * |---|---|---|
 * | Resolved | `Ok(value)` | Resolved with `value` |
 * | Resolved | `Err(error)` | Rejected with `error` |
 * | Rejected | — | Rejected with error |
 *
 * Use at the boundary where a non-true-myth caller expects a native Promise
 * (ts-japi, library callbacks, Temporal activities).
 */
export function taskToPromise<T, E>(task: Task<T, E>): Promise<T> {
  return task.toPromise().then((result) =>
    result.match({
      Ok: (value) => value,
      Err: (error) => {
        throw error;
      },
    }),
  );
}
