function isAppError(value, errorCode) {
  if (!(value instanceof Error)) return false;
  if (!('errorCode' in value) || typeof value.errorCode !== 'string') return false;
  if (errorCode !== undefined) return value.errorCode === errorCode;
  return true;
}

export { isAppError };
//# sourceMappingURL=is-app-error.js.map
