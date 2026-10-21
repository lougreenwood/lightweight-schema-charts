class AppError extends Error {
  errorCode;
  errorGroup;
  meta;
  severity;
  type;
  get name() {
    const baseName = this.constructor.name;
    return this.errorCode ? `${baseName}::${this.errorCode}` : baseName;
  }
  constructor(messageOrOptions, options) {
    const normalized = typeof messageOrOptions === 'string' ? {
      cause: options?.cause,
      context: options?.context,
      emitLog: options?.emitLog ?? false,
      errorCode: options?.errorCode,
      errorGroup: options?.errorGroup,
      message: messageOrOptions,
      meta: options?.meta,
      severity: options?.severity ?? 'error',
      type: options?.type
    } : messageOrOptions;
    const {
      cause,
      context,
      emitLog,
      errorCode,
      errorGroup,
      message,
      meta,
      severity,
      type
    } = normalized;
    super(message, cause ? {
      cause
    } : undefined);
    this.type = type;
    this.errorCode = errorCode;
    this.errorGroup = errorGroup;
    this.meta = meta ?? {};
    this.severity = severity;
    if (emitLog === true) {
      const logger = context?.logger ?? console;
      const logFn = logger[severity];
      if (logFn) {
        logFn.call(logger, {
          err: this,
          errorCode,
          errorGroup,
          meta: this.meta,
          type
        }, message);
      } else {
        console.error({
          err: this,
          errorCode,
          errorGroup,
          meta: this.meta,
          type
        }, message);
      }
    }
  }
  toJSON() {
    return {
      cause: this.cause,
      errorCode: this.errorCode,
      errorGroup: this.errorGroup,
      message: this.message,
      meta: this.meta,
      name: this.name,
      severity: this.severity,
      type: this.type
    };
  }
}
function createAppError({
  defaultEmitLog = true,
  defaultSeverity = 'error',
  type
}) {
  return class extends AppError {
    static {
      Object.defineProperty(this, 'name', {
        configurable: true,
        enumerable: false,
        value: type,
        writable: false
      });
    }
    static of(options) {
      const Ctor = this;
      const instance = new Ctor(options);
      return instance;
    }
    constructor(options) {
      super({
        ...options,
        emitLog: options.emitLog ?? defaultEmitLog,
        errorGroup: options.errorGroup,
        meta: options.meta ?? {},
        severity: options.severity ?? defaultSeverity,
        type
      });
    }
  };
}

export { AppError, createAppError };
//# sourceMappingURL=app-error.js.map
