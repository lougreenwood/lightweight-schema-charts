import type { Result } from 'true-myth';
import type { Task } from 'true-myth/task';

/**
 * Duck-type check for Task.
 *
 * Distinguishes Task from Result (or other values) by checking for the `isPending` property, which is unique to Task.
 *
 * @param   value - The value to check (typically a Result or Task)
 *
 * @returns       `true` if the value is a Task, `false` otherwise
 */
export function isTask<T, E>(
  value: Result<T, E> | Task<T, E>,
): value is Task<T, E>;
export function isTask(value: unknown): value is Task<unknown, unknown>;
export function isTask(value: unknown): value is Task<unknown, unknown> {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === 'object' &&
    'isPending' in value &&
    typeof value.isPending === 'boolean'
  );
}
