/**
 * Duck-type check for Task.
 *
 * Distinguishes Task from Result (or other values) by checking for the `isPending` property, which is unique to Task.
 *
 * @param   value - The value to check (typically a Result or Task)
 *
 * @returns       `true` if the value is a Task, `false` otherwise
 */

function isTask(value) {
  return value !== undefined && value !== null && typeof value === 'object' && 'isPending' in value && typeof value.isPending === 'boolean';
}

export { isTask };
//# sourceMappingURL=is-task.js.map
