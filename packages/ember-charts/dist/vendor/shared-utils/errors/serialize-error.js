import { isAppError } from './is-app-error.js';

/**
 * Serializes an error to a full JSON representation including stack. Captures all properties and recursively traverses
 * the cause chain. Handles circular references gracefully.
 */

function serializeError(error) {
  const seen = new WeakSet();
  const errorObject = serializeErrorRecursive(error);
  return JSON.stringify(errorObject, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

/**
 * Recursively serializes an error and its cause chain into a plain object.
 */
function serializeErrorRecursive(error, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Max depth reached]';
  }
  if (!(error instanceof Error)) {
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch {
        return '[Non-serializable object]';
      }
    }
    return String(error);
  }
  const errorObject = {
    message: error.message,
    name: error.name,
    stack: error.stack
  };

  // AppError-specific properties
  if ('type' in error) errorObject['type'] = error.type;
  if (isAppError(error)) errorObject['errorCode'] = error.errorCode;
  if ('errorGroup' in error) errorObject['errorGroup'] = error.errorGroup;
  if ('meta' in error) errorObject['meta'] = error.meta;
  if ('severity' in error) errorObject['severity'] = error.severity;

  // Recursively serialize cause
  if (error.cause !== undefined) {
    errorObject['cause'] = serializeErrorRecursive(error.cause, depth + 1);
  }
  return errorObject;
}

export { serializeError };
//# sourceMappingURL=serialize-error.js.map
