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
function taskToPromise(task) {
  return task.toPromise().then(result => result.match({
    Ok: value => value,
    Err: error => {
      throw error;
    }
  }));
}

export { taskToPromise };
//# sourceMappingURL=task-to-promise.js.map
