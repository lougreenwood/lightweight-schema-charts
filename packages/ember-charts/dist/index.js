import { tracked, cached } from '@glimmer/tracking';
import { err, ok, all } from 'true-myth/result';
import { g, i, n } from 'decorator-transforms/runtime-esm';
import { Maybe } from 'true-myth';
import { trackedMap } from '@ember/reactive/collections';
import startCase from 'lodash-es/startCase';
import { AreaSeries, BarSeries, BaselineSeries, CandlestickSeries, HistogramSeries, LineSeries, createChart, TickMarkType } from 'lightweight-charts';
import { registerDestructor } from '@ember/destroyable';
import Modifier from 'ember-modifier';

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

/**
 * NotFoundError instance type - use this in type positions.
 *
 * @example Type UserNotFoundError = NotFoundError<{ errorCode: 'USER_NOT_FOUND'; message: string; meta: { userId:
 * string }; // Required by default }>;
 */

/**
 * Generic error for when a requested resource doesn't exist.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type UserNotFoundError = NotFoundError<{
 * errorCode: 'USER_NOT_FOUND'; message: string; meta: { userId: string }; // Required - TypeScript enforces at call
 * site }>;
 *
 * // Use in function return type function getUser(id: string): Result<User, UserNotFoundError> { return Result.err(
 * NotFoundError.of({ errorCode: 'USER_NOT_FOUND', message: 'User not found in database', meta: { userId: id }, // ✅
 * Required - TypeScript error if omitted }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type UserNotFoundError = NotFoundError<{ errorCode:
 * 'USER_NOT_FOUND'; message: string }>; type PostNotFoundError = NotFoundError<{ errorCode: 'POST_NOT_FOUND'; message:
 * string }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type ContentErrors = UserNotFoundError | PostNotFoundError;
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type OptionalMetaError = NotFoundError<{ errorCode:
 * 'RESOURCE_NOT_FOUND'; message: string; meta?: { resourceId?: string }; // Explicitly optional }>;
 *
 * NotFoundError.of({ errorCode: 'RESOURCE_NOT_FOUND', message: 'Resource not found', context: { logger: myLogger }, //
 * Optional - for logging // meta is optional - can omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) NotFoundError.of({ errorCode:
 * 'USER_NOT_FOUND' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function getUser(): Result<User,
 * NotFoundError<{ errorCode: string; message: string }>> {} // BAD - not specific! function getPost(): Result<Post,
 * NotFoundError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
const NotFoundError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'warn',
  type: 'NotFoundError'
});

/**
 * ChartLayout
 *
 * Two-layer composition for chart layout state:
 *
 * Layer A — Derived Default (stateless, reactive): A `@cached` getter recomputed from the current providers'
 * `defaultLayout` fragments via a callback from the schema. New providers automatically appear because the callback
 * reads tracked provider state.
 *
 * Layer B — Persisted Overlay (stateful, user-modified): Stores ONLY entries where the user has changed something from
 * the default. Initially empty. Keyed by `groupId::fieldPath`.
 *
 * The public `.layout` getter merges both layers: overlay wins, stale overlay entries (no matching default) are
 * skipped.
 *
 * Reactivity: `#overlay` is @tracked. The `getDefaultLayout` callback reads tracked provider state upstream. Both
 * invalidation paths cause the merged `.layout` to recompute.
 */

class ChartLayout {
  /**
   * Merged layout: derived default + persisted overlay.
   *
   * Walks the derived default layout. For each series entry, checks the overlay — if an override exists, uses the
   * overlay's visibility; otherwise uses the default. Stale overlay entries (provider removed) are naturally skipped
   * because we iterate the default, not the overlay.
   */
  get layout() {
    const defaultLayout = this.#getDefaultLayout();
    const panes = defaultLayout.panes.map(pane => ({
      ...pane,
      seriesGroups: pane.seriesGroups.map(group => this.#applyOverlayToGroup({
        group
      }))
    }));
    return {
      panes
    };
  }
  get overlay() {
    const defaultLayout = this.#getDefaultLayout();
    return this._overlay.entries().map(([overlayKey, entry]) => {
      const {
        fieldPath,
        groupId
      } = this.#parseOverlayKey({
        overlayKey
      });
      const defaultSeries = this.#findSeriesInLayout({
        fieldPath,
        groupId,
        layout: defaultLayout
      });
      if (defaultSeries === undefined || defaultSeries.visible === entry.visible) {
        return undefined;
      }
      return {
        fieldPath,
        groupId,
        visible: entry.visible
      };
    }).filter(entry => entry !== undefined).toArray();
  }
  constructor({
    getDefaultLayout,
    initialOverlay,
    resolveGroupId
  }) {
    this.#getDefaultLayout = getDefaultLayout;
    this.#resolveGroupId = resolveGroupId;
    if (initialOverlay !== undefined) {
      this.replaceOverlay({
        overlay: initialOverlay
      });
    }
  }
  replaceOverlay({
    overlay
  }) {
    const defaultLayout = this.#getDefaultLayout();
    this._overlay = overlay.values().reduce((nextOverlay, entry) => {
      const defaultSeries = this.#findSeriesInLayout({
        fieldPath: entry.fieldPath,
        groupId: entry.groupId,
        layout: defaultLayout
      });
      if (defaultSeries === undefined || defaultSeries.visible === entry.visible) {
        return nextOverlay;
      }
      nextOverlay.set(this.#makeOverlayKey({
        fieldPath: entry.fieldPath,
        groupId: entry.groupId
      }), {
        visible: entry.visible
      });
      return nextOverlay;
    }, new Map());
  }

  /**
   * Toggle visibility of a specific series field.
   *
   * Resolves groupId from the dataStreamIdentifier via the injected resolver, verifies the field exists in the current
   * derived default layout, then promotes the toggled value into the overlay. If the resulting visibility matches the
   * default, the overlay entry is removed (cleanup).
   */
  toggleSeries({
    identifier: {
      dataStreamIdentifier,
      fieldPath
    }
  }) {
    const groupId = this.#resolveGroupId({
      dataStreamIdentifier
    });
    if (groupId === undefined) {
      return err(NotFoundError.of({
        errorCode: 'CHART_LAYOUT_PROVIDER_NOT_FOUND',
        message: `Cannot toggle series: no provider found for stream ${dataStreamIdentifier.id}`,
        meta: {
          dataStreamIdentifier
        }
      }));
    }

    // Find the field in the current derived default to determine default visibility
    const defaultLayout = this.#getDefaultLayout();
    const defaultSeries = this.#findSeriesInLayout({
      fieldPath,
      groupId,
      layout: defaultLayout
    });
    if (defaultSeries === undefined) {
      return err(NotFoundError.of({
        errorCode: 'CHART_LAYOUT_FIELD_NOT_FOUND',
        message: `Cannot toggle series: field '${fieldPath}' not found in layout for ${groupId}`,
        meta: {
          fieldPath,
          groupId
        }
      }));
    }
    const overlayKey = this.#makeOverlayKey({
      fieldPath,
      groupId
    });

    // Determine new visibility: check overlay first, fall back to default
    const currentOverlay = this._overlay.get(overlayKey);
    const currentVisible = currentOverlay !== undefined ? currentOverlay.visible : defaultSeries.visible;
    const newVisible = !currentVisible;

    // If toggled value matches default, remove from overlay (cleanup); otherwise store override
    const updatedOverlay = new Map(this._overlay);
    if (newVisible === defaultSeries.visible) {
      updatedOverlay.delete(overlayKey);
    } else {
      updatedOverlay.set(overlayKey, {
        visible: newVisible
      });
    }
    this._overlay = updatedOverlay;
    return ok(true);
  }
  static {
    g(this.prototype, "_overlay", [tracked], function () {
      return new Map();
    });
  }
  #_overlay = (i(this, "_overlay"), void 0);
  #getDefaultLayout;
  #resolveGroupId;

  /**
   * Apply overlay overrides to a single series group. Returns a new group with series visibility merged.
   */
  #applyOverlayToGroup({
    group
  }) {
    return {
      ...group,
      series: group.series.map(s => {
        const overlayKey = this.#makeOverlayKey({
          fieldPath: s.fieldPath,
          groupId: group.groupId
        });
        const override = this._overlay.get(overlayKey);
        return override !== undefined ? {
          ...s,
          visible: override.visible
        } : s;
      })
    };
  }

  /**
   * Find a series entry in a layout by groupId + fieldPath.
   */
  #findSeriesInLayout({
    fieldPath,
    groupId,
    layout
  }) {
    for (const pane of layout.panes) {
      for (const group of pane.seriesGroups) {
        if (group.groupId === groupId) {
          const series = group.series.find(s => s.fieldPath === fieldPath);
          if (series) return series;
        }
      }
    }
    return undefined;
  }

  /**
   * Build the overlay key for a series field.
   */
  #makeOverlayKey({
    fieldPath,
    groupId
  }) {
    return `${groupId}::${fieldPath}`;
  }
  #parseOverlayKey({
    overlayKey
  }) {
    const fieldPathStartIndex = overlayKey.indexOf('::data.');
    const metaFieldPathStartIndex = overlayKey.indexOf('::meta.');
    const splitIndex = fieldPathStartIndex >= 0 ? fieldPathStartIndex : metaFieldPathStartIndex;
    if (splitIndex < 0) {
      return {
        fieldPath: overlayKey,
        groupId: ''
      };
    }
    return {
      fieldPath: overlayKey.slice(splitIndex + 2),
      groupId: overlayKey.slice(0, splitIndex)
    };
  }
}

/**
 * InvariantViolationError instance type - use this in type positions.
 *
 * @example Type InvalidStateTransitionError = InvariantViolationError<{ errorCode: 'INVALID_STATE_TRANSITION'; message:
 * string; meta: { fromState: string; toState: string }; // Required by default }>;
 */

/**
 * Generic error for when an internal invariant or assertion failed (developer mistake).
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for unreachable code paths, broken state transitions, logic bugs, or any condition that should never occur
 * in correct code. These errors typically indicate bugs that need fixing.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type InvalidStateTransitionError =
 * InvariantViolationError<{ errorCode: 'INVALID_STATE_TRANSITION'; meta: { invariant: 'Cannot transition from Executing
 * to Idle'; details?: { fromState: string; toState: string }; }; }>;
 *
 * // Use in function return type or throw (within Result/Task contexts) function transitionState(fromState: string,
 * toState: string): Result<void, InvalidStateTransitionError> { if (fromState === 'Executing' && toState === 'Idle') {
 * return Result.err( InvariantViolationError.of({ errorCode: 'INVALID_STATE_TRANSITION', message: 'Cannot transition
 * from Executing to Idle', meta: { fromState, toState }, }), ); } return Result.ok(undefined); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type UnreachableCodePathError =
 * InvariantViolationError<{ errorCode: 'UNREACHABLE_CODE_PATH'; message: string; meta?: { details: unknown }; }>;
 *
 * Type MissingRequiredFieldError = InvariantViolationError<{ errorCode: 'MISSING_REQUIRED_FIELD'; message: string;
 * meta?: { field: string }; }>;
 *
 * // Discriminate on errorCode function handleInvariant(error: UnreachableCodePathError | MissingRequiredFieldError) {
 * switch (error.errorCode) { case 'UNREACHABLE_CODE_PATH': // Handle unreachable branch diagnostics break; case
 * 'MISSING_REQUIRED_FIELD': // Handle developer fix instructions break; } }
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) InvariantViolationError.of({ errorCode:
 * 'INVALID_STATE' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * InvariantViolationError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * InvariantViolationError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal
 * errorCode types!
 */
createAppError({
  // Invariants signal developer errors: log by default and use a high severity.
  defaultEmitLog: true,
  defaultSeverity: 'fatal',
  type: 'InvariantViolationError'
});

/**
 * PreconditionError instance type - use this in type positions.
 *
 * @example Type TaskPreconditionNotMetError = PreconditionError<{ errorCode: 'TASK_PRECONDITION_NOT_MET'; message:
 * string; meta: { taskId: string; reason: string }; }>;
 */

/**
 * Generic error for when preconditions required for an operation are not met.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * Use this when an operation cannot proceed because necessary conditions are not satisfied. This differs from
 * ValidationError (which checks input correctness) - preconditions check system state, resource availability, or
 * dependencies required for the operation to execute.
 *
 * Examples:
 *
 * - Required resource not yet initialized
 * - Dependent service not available
 * - System state incompatible with operation
 * - Required data not loaded
 * - Prerequisites not satisfied
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type DataNotLoadedError = PreconditionError<{
 * errorCode: 'DATA_NOT_LOADED'; message: string; meta: { requiredData: string }; }>;
 *
 * Function processData(): Result<Data, DataNotLoadedError> { if (!this.isDataLoaded) { return Result.err(
 * PreconditionError.of({ errorCode: 'DATA_NOT_LOADED', message: 'Cannot process - data not yet loaded', meta: {
 * requiredData: 'userProfile' }, }), ); } return Result.ok(this.data); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type ServiceNotReadyError = PreconditionError<{
 * errorCode: 'SERVICE_NOT_READY'; message: string; meta: { service: string }; }>; type DependencyMissingError =
 * PreconditionError<{ errorCode: 'DEPENDENCY_MISSING'; message: string; meta: { dependency: string }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'SERVICE_NOT_READY':
 * console.log('Service not ready:', error.meta.service); break; case 'DEPENDENCY_MISSING': console.log('Missing
 * dependency:', error.meta.dependency); break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) PreconditionError.of({ errorCode:
 * 'NOT_READY' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function checkA(): Result<A,
 * PreconditionError<{ errorCode: string; message: string }>> {} // BAD! function checkB(): Result<B,
 * PreconditionError<{ errorCode: string; message: string }>> {} // BAD! // Always use literal errorCode types!
 */
const PreconditionError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'warn',
  type: 'PreconditionError'
});

/**
 * UnavailableError instance type - use this in type positions.
 *
 * @example Type BitQueryUnavailableError = UnavailableError<{ errorCode: 'BITQUERY_UNAVAILABLE'; message: string;
 * meta?: { dependency: string; reason?: string }; }>;
 */

/**
 * Generic error for when a dependency or service is unavailable (network error, API downtime, connection pool
 * exhaustion, or any temporary disruption).
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type BitQueryUnavailableError = UnavailableError<{
 * errorCode: 'BITQUERY_UNAVAILABLE'; meta: { dependency: 'BitQueryAPI'; reason?: string }; }>;
 *
 * // Use in function return type function fetchFromBitQuery(...): Result<Data, BitQueryUnavailableError> { return
 * Result.err( UnavailableError.of({ errorCode: 'BITQUERY_UNAVAILABLE', message: 'BitQueryAPI is unavailable - Network
 * timeout', meta: { dependency: 'BitQueryAPI', reason: 'Network timeout' }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type DatabaseUnavailableError = UnavailableError<{
 * errorCode: 'DATABASE_UNAVAILABLE'; message: string; meta?: { dependency: string; reason?: string }; }>; type
 * RedisUnavailableError = UnavailableError<{ errorCode: 'REDIS_UNAVAILABLE'; message: string; meta?: { dependency:
 * string; reason?: string }; }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'DATABASE_UNAVAILABLE':
 * // Handle DB fallback break; case 'REDIS_UNAVAILABLE': // Handle Redis fallback break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) UnavailableError.of({ errorCode:
 * 'UNAVAILABLE' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * UnavailableError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * UnavailableError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'UnavailableError'
});

/**
 * ValidationError instance type - use this in type positions.
 *
 * @example Type InvalidEmailError = ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; meta: { email:
 * string }; // Required by default }>;
 */

/**
 * Generic error for when validation checks fail.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * **Scope of Validation:** The scope of what constitutes a "validation error" is **context-dependent** and **relative
 * to the validator's responsibility**. Use this error ONLY when the component/function is explicitly responsible for
 * validating a specific aspect. For example:
 *
 * - A gate validator checking thresholds: threshold not met IS a validation error
 * - A parser checking format: malformed data IS a validation error
 * - A function that doesn't validate data availability: missing data is NOT a validation error
 *
 * **Ask yourself:** "Is this component's job to validate this condition?" If yes, use ValidationError. If no, the error
 * belongs elsewhere in the error taxonomy.
 *
 * Use this for validation failures including invalid input, criteria not met, thresholds not satisfied, malformed data,
 * out-of-range values, or any condition where the validator's logic determines something is unacceptable.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type InvalidEmailError =
 * ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; meta: { email: string }; // Required - TypeScript
 * enforces at call site }>;
 *
 * // Use in function return type function validateEmail(email: string): Result<string, InvalidEmailError> { if
 * (!email.includes('@')) { return Result.err( ValidationError.of({ errorCode: 'INVALID_EMAIL', message: 'Email must
 * contain @ symbol', meta: { email }, // ✅ Required - TypeScript error if omitted }), ); } return Result.ok(email); }
 *
 * @example // ✅ CORRECT: Use for threshold/criteria validation with required meta type ThresholdNotMetError =
 * ValidationError<{ errorCode: 'THRESHOLD_NOT_MET'; message: string; meta: { actual: number; threshold: number; gate:
 * string }; // Required }>;
 *
 * Function checkThreshold(value: number): Result<void, ThresholdNotMetError> { if (value < 0.8) { return Result.err(
 * ValidationError.of({ errorCode: 'THRESHOLD_NOT_MET', message: `Threshold not met: ${value} < 0.8`, meta: { actual:
 * value, threshold: 0.8, gate: 'buyPressure' }, // ✅ Required }), ); } return Result.ok(undefined); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint (no meta needed) type InvalidEmailError =
 * ValidationError<{ errorCode: 'INVALID_EMAIL'; message: string; }>; type OutOfRangeError = ValidationError<{
 * errorCode: 'OUT_OF_RANGE'; message: string; }>; type MalformedDataError = ValidationError<{ errorCode:
 * 'MALFORMED_DATA'; message: string; }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type ValidationErrors = InvalidEmailError | OutOfRangeError |
 * MalformedDataError;
 *
 * // Handle with discrimination result.match({ err: (error) => { switch (error.errorCode) { case 'INVALID_EMAIL':
 * console.log('Email validation failed:', error.message); break; case 'OUT_OF_RANGE': console.log('Value out of
 * acceptable range:', error.message); break; case 'MALFORMED_DATA': console.log('Data format is invalid:',
 * error.message); break; } }, });
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type ConfigWarning = ValidationError<{ errorCode:
 * 'CONFIG_WARNING'; message: string; meta?: { config?: string }; // Explicitly optional }>;
 *
 * ValidationError.of({ errorCode: 'CONFIG_WARNING', message: 'Config issue detected', context: { logger: myLogger }, //
 * Optional - for logging // meta is optional - can omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) ValidationError.of({ errorCode:
 * 'INVALID' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function validateEmail():
 * Result<Email, ValidationError<{ errorCode: string; message: string }>> {} // BAD - not specific! function
 * validateAge(): Result<Age, ValidationError<{ errorCode: string; message: string }>> {} // BAD - not specific! //
 * Always use literal errorCode types!
 */
const ValidationError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'debug',
  // Validation failures are often expected conditions, not system errors
  type: 'ValidationError'
});

/**
 * Create a ChartSchemaPresenterNotFoundError
 */
function createPresenterNotFoundError({
  streamKey
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_PRESENTER_NOT_FOUND',
    message: `Presenter not found for stream: ${streamKey}`,
    meta: {
      streamKey
    }
  });
}

/**
 * ReactiveChartSchema
 *
 * Reactive replacement for the imperative ChartSchema. Layout is derived from data provider/presenter membership rather
 * than maintained via manual add/remove calls. Stale state is structurally impossible because everything derives from
 * live data.
 *
 * Three levels of layout:
 *
 * 1. Layout Fragments — Provider-level, anonymous (from provider.defaultLayout)
 * 2. Default Layout — Schema-assembled from fragments, tagged with stableLayoutKey
 * 3. Actual Layout — User-modified (toggles, reorder), owned by ChartLayout class
 *
 * The reactive schema does NOT touch chart DOM. It produces layout state that the adapter (Layer 3) reads and syncs to
 * LWC APIs.
 *
 * The schema does NOT own domain-specific data (market data samples, tradable asset pair names, timeframe labels).
 * Those concerns belong upstream on the component or interactions layer. The schema receives a `getDataProviders`
 * callback and derives everything from the returned provider set.
 */

class ReactiveChartSchema {
  /**
   * Reactive getter: flat map of all data streams to their owning providers.
   *
   * Reactivity source: `#getDataProviders()` reads tracked consumer state. When provider instances change (for example,
   * a timeframe change produces a new source and new providers), Ember autotracking invalidates this getter.
   *
   * Key: DataStreamIdentifier (globally unique — contains dataProviderIdentifier + stream id/type) Value: Owning
   * DataProviderLike instance
   */
  get dataProviderMap() {
    const providers = this.#getDataProviders();
    return providers.values().flatMap(dataProvider => dataProvider.dataStreamIdentifiers.values().map(dataStreamIdentifier => [dataStreamIdentifier, dataProvider])).reduce((map, [dataStreamIdentifier, dataProvider]) => {
      map.set(dataStreamIdentifier, dataProvider);
      return map;
    }, new Map());
  }

  /**
   * Full set of data providers, including those with no streams (e.g., empty indicator providers).
   *
   * Consumers that need the complete provider inventory (such as the series selector) use this getter. Stream-centric
   * consumers should use `dataProviderMap` or `presenters` instead.
   */
  static {
    n(this.prototype, "dataProviderMap", [cached]);
  }
  get dataProviders() {
    return this.#getDataProviders();
  }

  /**
   * The ChartLayout instance (Level 3 — actual layout with user modifications).
   *
   * Exposes the layout class so callers can access the mutation API (e.g., `toggleSeries`). The schema itself reads
   * `this.#chartLayout.layout` reactively for the enriched tree derivation.
   */
  get layout() {
    return this.#chartLayout;
  }

  /**
   * Reactive getter: resolve presenters for all active streams.
   *
   * Returns the same public surface as v1's `presenters` getter (ReadonlyMap<streamKey, DataStreamPresenterLike>).
   * Reactivity flows from dataProviderMap → inline presenter creation.
   */
  get presenters() {
    return this.dataProviderMap.entries().map(([dataStreamIdentifier, dataProvider]) => {
      const streamKey = this.#makeDataStreamKey({
        dataProvider,
        dataStreamIdentifier
      });
      const presenter = this.#makePresenter({
        dataProvider,
        dataStreamIdentifier
      });

      // Track naming dependencies so selector consumers invalidating off `presenters`
      // update when indicator instance names/provider labels change.
      void presenter.streamName;
      void presenter.providerName;
      return [streamKey, presenter];
    }).reduce((map, [key, presenter]) => {
      map.set(key, presenter);
      return map;
    }, new Map());
  }

  /**
   * Reactive getter: derive selected series from the current layout.
   *
   * Returns Map<streamKey, Map<SeriesPath, true>> — same public surface as v1's `selectedSeries`.
   */
  static {
    n(this.prototype, "presenters", [cached]);
  }
  get selectedSeries() {
    const result = new Map();
    for (const pane of this.#chartLayout.layout.panes) {
      for (const group of pane.seriesGroups) {
        const dataStreamIdentifier = this.#findDataStreamIdentifierForGroup({
          group
        });
        const streamKey = dataStreamIdentifier === undefined ? undefined : this.#findStreamKeyForDataStreamIdentifier({
          dataStreamIdentifier
        });
        if (streamKey === undefined) {
          continue;
        }
        const visibleFields = group.series.filter(s => s.visible).reduce((fields, s) => {
          fields.set(s.fieldPath, true);
          return fields;
        }, new Map());
        if (visibleFields.size > 0) {
          const existing = result.get(streamKey);
          if (existing) {
            visibleFields.entries().forEach(([k, v]) => existing.set(k, v));
          } else {
            result.set(streamKey, visibleFields);
          }
        }
      }
    }
    return result;
  }

  /**
   * Enriched tree: crosses the provider inventory with the layout overlay to produce a fully-resolved, read-only
   * snapshot for the chart adapter (Layer 3).
   *
   * Reactivity sources: `dataProviderMap` (tracked via getDataProviders callback) and `#chartLayout.layout` (@tracked).
   *
   * Walks the layout — the layout is the source of truth for what is shown and how it's arranged. For each layout
   * group, looks up the matching provider/stream from a membership lookup to enrich it. Layout entries with no matching
   * membership entry are inert (provider disappeared) and skipped.
   *
   * Indicator-specific data state (projectionId, dataHash) is derived via type guard narrowing on the provider.
   */
  get state() {
    const providerMap = this.dataProviderMap;
    const layout = this.#chartLayout.layout;

    // Build a fast lookup from live stream id first, then fall back to stable group identity.
    const membershipLookup = providerMap.entries().reduce((lookup, [dataStreamIdentifier, dataProvider]) => {
      lookup.byDataStreamId.set(dataStreamIdentifier.id, {
        dataProvider,
        dataStreamIdentifier
      });
      const groupId = this.#makeGroupId({
        dataProvider,
        dataStreamIdentifier
      });
      lookup.byGroupId.set(groupId, {
        dataProvider,
        dataStreamIdentifier
      });
      return lookup;
    }, {
      byGroupId: new Map(),
      byDataStreamId: new Map()
    });

    // Walk the layout — the layout is the source of truth for what is shown and how it's arranged.
    // For each layout group, look up the matching provider/stream from membership to enrich it.
    // Layout entries with no matching membership entry are inert (provider disappeared) and skipped.
    const panes = layout.panes.values().map(pane => {
      const seriesGroups = pane.seriesGroups.values().reduce((groups, group) => {
        const entry = (group.dataStreamId === undefined ? undefined : membershipLookup.byDataStreamId.get(group.dataStreamId)) ?? (group.groupId === undefined ? undefined : membershipLookup.byGroupId.get(group.groupId));
        if (!entry) {
          return groups;
        }
        const {
          dataProvider,
          dataStreamIdentifier
        } = entry;
        const presenter = this.#makePresenter({
          dataProvider,
          dataStreamIdentifier
        });
        const series = group.series.map(({
          fieldPath,
          visible
        }) => ({
          fieldPath,
          visible
        }));
        if (!series.some(({
          visible
        }) => visible)) {
          return groups;
        }
        const dataState = this.#deriveDataState({
          dataProvider,
          dataStreamIdentifier
        });
        groups.push({
          dataState,
          dataStreamIdentifier,
          groupId: this.#makeGroupId({
            dataProvider,
            dataStreamIdentifier
          }),
          presenter,
          priceScale: group.priceScale,
          provider: dataProvider,
          series,
          stableLayoutKey: group.stableLayoutKey,
          streamType: group.streamType
        });
        return groups;
      }, []);
      return {
        seriesGroups
      };
    }).filter(pane => pane.seriesGroups.length > 0).toArray();

    // Track label dependencies for chart adapter consumers that read `schema.state`.
    // This ensures name-only changes (instance/provider labels) invalidate state
    // even when no structural or data-shape changes occurred.
    panes.values().forEach(pane => {
      pane.seriesGroups.values().forEach(group => {
        void group.presenter.streamName;
        void group.provider.name;
      });
    });
    return {
      panes
    };
  }
  constructor({
    dataStreamPresenterRegistry,
    getDataProviders,
    initialLayoutOverlay
  }) {
    this.#getDataProviders = getDataProviders;
    this.#dataStreamPresenterRegistry = dataStreamPresenterRegistry;
    this.#chartLayout = new ChartLayout({
      initialOverlay: initialLayoutOverlay,
      getDefaultLayout: () => this.#defaultLayout,
      resolveGroupId: ({
        dataStreamIdentifier
      }) => this.#resolveGroupId({
        dataStreamIdentifier
      })
    });
  }

  /**
   * Look up a presenter by its data stream identifier.
   *
   * Walks dataProviderMap to find the matching provider, creates the presenter inline. Same public surface as v1
   * ChartSchema.getPresenterForStream.
   */
  getPresenterForStream({
    dataStreamIdentifier
  }) {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (streamId.type === dataStreamIdentifier.type && streamId.id === dataStreamIdentifier.id) {
        const presenter = this.#makePresenter({
          dataProvider,
          dataStreamIdentifier: streamId
        });
        return ok(presenter);
      }
    }

    // Build a fallback stream key for the error message
    const fallbackKey = `${dataStreamIdentifier.dataProviderIdentifier.type}-${dataStreamIdentifier.dataProviderIdentifier.id}-${dataStreamIdentifier.type}-${dataStreamIdentifier.id}`;
    return err(createPresenterNotFoundError({
      streamKey: fallbackKey
    }));
  }

  /**
   * Toggle visibility of a specific series field. Delegates to ChartLayout.
   *
   * Returns Result — the layout mutation triggers Ember tracking, which recomputes `state` downstream.
   */
  toggleSeries({
    identifier
  }) {
    return this.#chartLayout.toggleSeries({
      identifier
    }).match({
      Err: error => err(error),
      Ok: value => ok(value)
    });
  }
  #chartLayout;
  #dataStreamPresenterRegistry;
  #getDataProviders;

  /**
   * Derived default layout (Level 2) — recomputed when providers change.
   *
   * Walks providers from getDataProviders(), takes each provider's `defaultLayout` fragment (which declares pane
   * structure and stream type groupings with empty series arrays), tags each group with stableLayoutKey, then fills in
   * series detail (field paths + visibility) from the matching stream's presenter.
   *
   * This is the Layer A input to ChartLayout's two-layer composition. Called via the `getDefaultLayout` callback passed
   * to ChartLayout. Reactivity flows through ChartLayout's `@cached layout` getter — when `#getDataProviders()` reads
   * tracked state upstream, ChartLayout's getter invalidates and re-calls this method.
   */
  get #defaultLayout() {
    const providers = this.#getDataProviders();
    const allPanes = [];
    for (const dataProvider of providers) {
      const fragment = dataProvider.defaultLayout;
      const declaredStreamTypes = fragment.panes.values().reduce((streamTypes, pane) => {
        pane.seriesGroups.values().forEach(({
          streamType
        }) => streamTypes.add(streamType));
        return streamTypes;
      }, new Set());

      // Tag fragment with stableLayoutKey and fill in series from presenters
      const filledPanes = fragment.panes.map(pane => {
        const seriesGroups = pane.seriesGroups.map(group => {
          const matchingStream = this.#findDataStreamIdentifierForDefaultGroup({
            dataProvider,
            group
          });
          if (!matchingStream) {
            return {
              ...group,
              groupId: `${dataProvider.stableLayoutKey}::${group.streamType}`,
              stableLayoutKey: dataProvider.stableLayoutKey
            };
          }
          const presenter = this.#makePresenter({
            dataProvider,
            dataStreamIdentifier: matchingStream
          });
          return {
            dataStreamId: matchingStream.id,
            groupId: this.#makeGroupId({
              dataProvider,
              dataStreamIdentifier: matchingStream
            }),
            priceScale: group.priceScale,
            series: this.#resolveSeriesFromPresenter({
              presenter
            }),
            stableLayoutKey: dataProvider.stableLayoutKey,
            streamType: group.streamType
          };
        });
        return {
          ...(pane.sortPriority !== undefined ? {
            sortPriority: pane.sortPriority
          } : {}),
          seriesGroups
        };
      });
      const hiddenFallbackPanes = dataProvider.dataStreamIdentifiers.values().filter(dataStreamIdentifier => !declaredStreamTypes.has(dataStreamIdentifier.type)).map(dataStreamIdentifier => this.#buildHiddenFallbackPane({
        dataProvider,
        dataStreamIdentifier
      })).toArray();
      allPanes.push(...filledPanes, ...hiddenFallbackPanes);
    }
    return {
      panes: allPanes
    };
  }
  #buildHiddenFallbackPane({
    dataProvider,
    dataStreamIdentifier
  }) {
    const presenter = this.#makePresenter({
      dataProvider,
      dataStreamIdentifier
    });
    return {
      seriesGroups: [{
        dataStreamId: dataStreamIdentifier.id,
        groupId: this.#makeGroupId({
          dataProvider,
          dataStreamIdentifier
        }),
        stableLayoutKey: dataProvider.stableLayoutKey,
        streamType: dataStreamIdentifier.type,
        series: this.#resolveSeriesFromPresenter({
          presenter
        }).map(({
          fieldPath
        }) => ({
          fieldPath,
          visible: false
        }))
      }]
    };
  }

  /**
   * Recursively collect all leaf series field paths from a set of structural descriptors.
   */
  #collectAllSeriesPaths({
    descriptors
  }) {
    return descriptors.values().reduce((paths, descriptor) => {
      if (descriptor.kind === 'series') {
        paths.add(descriptor.identifier.fieldPath);
      } else {
        const childPaths = this.#collectAllSeriesPaths({
          descriptors: descriptor.children
        });
        for (const path of childPaths) {
          paths.add(path);
        }
      }
      return paths;
    }, new Set());
  }

  /**
   * Derive per-stream data state via type guard narrowing.
   *
   * Cursor is available on all providers. projectionId and dataHash are optional and supplied by the provider's
   * `getDataState`.
   */
  #deriveDataState({
    dataProvider,
    dataStreamIdentifier
  }) {
    return dataProvider.getDataState({
      dataStreamIdentifier
    });
  }
  #findDataStreamIdentifierForDefaultGroup({
    dataProvider,
    group
  }) {
    if (group.dataStreamId !== undefined) {
      const matchingStreamById = dataProvider.dataStreamIdentifiers.values().find(dataStreamIdentifier => dataStreamIdentifier.id === group.dataStreamId);
      if (matchingStreamById !== undefined) {
        return matchingStreamById;
      }
    }
    if (group.groupId !== undefined) {
      const matchingStreamByGroupId = dataProvider.dataStreamIdentifiers.values().find(dataStreamIdentifier => {
        return this.#makeGroupId({
          dataProvider,
          dataStreamIdentifier
        }) === group.groupId;
      });
      if (matchingStreamByGroupId !== undefined) {
        return matchingStreamByGroupId;
      }
    }
    return dataProvider.dataStreamIdentifiers.values().find(dataStreamIdentifier => dataStreamIdentifier.type === group.streamType);
  }

  /**
   * Find the live data stream identifier for a layout group.
   */
  #findDataStreamIdentifierForGroup({
    group
  }) {
    if (group.dataStreamId !== undefined) {
      const streamById = this.dataProviderMap.keys().find(dataStreamIdentifier => dataStreamIdentifier.id === group.dataStreamId);
      if (streamById !== undefined) {
        return streamById;
      }
    }
    for (const [dataStreamIdentifier, dataProvider] of this.dataProviderMap) {
      const groupId = this.#makeGroupId({
        dataProvider,
        dataStreamIdentifier
      });
      if (group.groupId !== undefined && groupId === group.groupId) {
        return dataStreamIdentifier;
      }
    }
    return undefined;
  }
  #findStreamKeyForDataStreamIdentifier({
    dataStreamIdentifier
  }) {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (streamId.type === dataStreamIdentifier.type && streamId.id === dataStreamIdentifier.id) {
        return this.#makeDataStreamKey({
          dataProvider,
          dataStreamIdentifier: streamId
        });
      }
    }
    return undefined;
  }

  /**
   * Stream key: `${providerType}-${providerId}-${streamType}-${streamId}`
   */
  #makeDataStreamKey({
    dataProvider,
    dataStreamIdentifier
  }) {
    return `${dataProvider.identifier.type}-${dataProvider.identifier.id}-${dataStreamIdentifier.type}-${dataStreamIdentifier.id}`;
  }
  #makeGroupId({
    dataProvider,
    dataStreamIdentifier
  }) {
    return dataProvider.groupIdFor({
      dataStreamIdentifier
    });
  }

  /**
   * Create a data stream presenter via the registry. No caching — presenters are stateless and created inline inside
   *
   * @cached getters. When providers change, the @cached getter invalidates and new presenters are created.
   */
  #makePresenter({
    dataProvider,
    dataStreamIdentifier
  }) {
    return this.#dataStreamPresenterRegistry.makeDataStreamPresenter({
      dataProvider,
      dataStreamIdentifier
    });
  }

  /**
   * Resolve a DataStreamIdentifier to its canonical group identity by walking dataProviderMap.
   *
   * Bound and passed to ChartLayout at construction so the layout can resolve identifiers without direct access to the
   * provider set.
   */
  #resolveGroupId({
    dataStreamIdentifier
  }) {
    for (const [streamId, dataProvider] of this.dataProviderMap) {
      if (streamId.type === dataStreamIdentifier.type && streamId.id === dataStreamIdentifier.id) {
        return this.#makeGroupId({
          dataProvider,
          dataStreamIdentifier: streamId
        });
      }
    }
    return undefined;
  }

  /**
   * Resolve series detail (field paths + visibility) from a presenter's structural descriptors and defaultSeries.
   *
   * Collects all leaf series paths from the presenter's descriptor tree, then marks each as visible if it's in the
   * presenter's `defaultSeries` set. Used by `#assembleDefaultLayout()` to fill in the provider's empty series arrays.
   */
  #resolveSeriesFromPresenter({
    presenter
  }) {
    const visiblePaths = presenter.defaultSeries;
    const allPaths = this.#collectAllSeriesPaths({
      descriptors: presenter.structuralDescriptors
    });
    return allPaths.values().map(fieldPath => ({
      fieldPath,
      visible: visiblePaths.has(fieldPath)
    })).toArray();
  }
}

/**
 * Create the chart schema from consumer-supplied providers and presenters.
 *
 * The package never reads an application model. A consumer supplies its provider instances, a presenter factory that
 * understands its provider types, and an optional persisted layout overlay.
 */
function createReactiveChartSchema({
  getDataProviders,
  presenterFactory,
  initialLayoutOverlay
}) {
  return new ReactiveChartSchema({
    dataStreamPresenterRegistry: presenterFactory,
    getDataProviders,
    initialLayoutOverlay
  });
}

/**
 * EmptyResultError instance type - use this in type positions.
 *
 * @example Type NoMatchingUsersError = EmptyResultError<{ errorCode: 'NO_MATCHING_USERS'; message: string; meta?: {
 * filters: UserFilters }; }>;
 */

/**
 * Generic error for when a query/search/filter returns no results.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * **Semantic Meaning:**
 *
 * - Use when **processing succeeded** but **output was empty**
 * - The operation completed normally, constraints were met, but zero results were produced
 * - Example: Filter matched 0 items, query returned 0 rows, search found 0 matches
 *
 * **DO NOT use when:**
 *
 * - Processing failed due to missing/invalid input data
 * - Required data is unavailable (use ValidationError or create DataUnavailableError)
 * - Computation cannot proceed (use InvariantViolationError or create ComputationError)
 *
 * Use this instead of returning empty arrays/collections when emptiness is exceptional.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type NoMatchingUsersError =
 * EmptyResultError<{ errorCode: 'NO_MATCHING_USERS'; message: string; meta: { filters: UserFilters }; // Required -
 * TypeScript enforces at call site }>; }>;
 *
 * // Use in function return type function findUsers(filters: UserFilters): Result<User[], NoMatchingUsersError> { const
 * users = queryUsers(filters); if (users.length === 0) { return Result.err( EmptyResultError.of({ errorCode:
 * 'NO_MATCHING_USERS', message: 'No users matched the provided filters', meta: { filters }, }), ); } return
 * Result.ok(users); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type NoMatchingUsersError = EmptyResultError<{
 * errorCode: 'NO_MATCHING_USERS'; message: string; }>; type NoMatchingPostsError = EmptyResultError<{ errorCode:
 * 'NO_MATCHING_POSTS'; message: string; }>; type EmptyDatasetError = EmptyResultError<{ errorCode: 'EMPTY_DATASET';
 * message: string; }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type QueryErrors = NoMatchingUsersError |
 * NoMatchingPostsError | EmptyDatasetError;
 *
 * // Handle with discrimination result.match({ err: (error) => { switch (error.errorCode) { case 'NO_MATCHING_USERS':
 * console.log('No users found'); break; case 'NO_MATCHING_POSTS': console.log('No posts found'); break; case
 * 'EMPTY_DATASET': console.log('Dataset is empty'); break; } }, });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) EmptyResultError.of({ errorCode:
 * 'NO_RESULTS' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function findUsers():
 * Result<User[], EmptyResultError<{ errorCode: string; message: string }>> {} // BAD - not specific! function
 * findPosts(): Result<Post[], EmptyResultError<{ errorCode: string; message: string }>> {} // BAD - not specific! //
 * Always use literal errorCode types!
 */
const EmptyResultError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'debug',
  // Empty results are often expected, not critical errors
  type: 'EmptyResultError'
});

/**
 * Error when creating a data provider with a mismatched id.
 *
 * This indicates the provided identifier's id doesn't match any expected identifier.
 */

/**
 * Error when creating a data provider with a mismatched type.
 *
 * This indicates the provided identifier's type doesn't match any expected type.
 */

/**
 * Error when a cursor is requested for a stream that has not established one yet.
 *
 * This is an expected condition during initial data fetch or before the first successful data retrieval.
 */

/**
 * Error when no new data is available since the provided cursor.
 *
 * This is an expected condition - not a true error - indicating the data is up-to-date. Providers must never emit empty
 * update sets; they should return this error instead.
 */

/**
 * Error when callers reference an unknown stream id.
 *
 * This indicates the requested stream identifier doesn't exist in the provider's known streams.
 */

/**
 * Error when a data stream has no data available.
 *
 * This indicates the stream exists but contains no data samples.
 */

/**
 * Error when attempting to get configuration for a data stream that does not support configuration.
 *
 * This is a precondition error because the stream type itself does not support configuration, not because the stream
 * doesn't exist or the config is temporarily unavailable.
 */

/**
 * Create a CreateDataProviderInvalidIdError
 */
function createDataProviderInvalidIdError({
  expected,
  received
}) {
  return ValidationError.of({
    errorCode: 'CREATE_DATA_PROVIDER_INVALID_ID',
    message: `DataProvider create failed: expected id='${expected}', received id='${received}'`,
    meta: {
      expected,
      received
    }
  });
}

/**
 * Create a CreateDataProviderInvalidTypeError
 */
function createDataProviderInvalidTypeError({
  expected,
  received
}) {
  return ValidationError.of({
    errorCode: 'CREATE_DATA_PROVIDER_INVALID_TYPE',
    message: `DataProvider create failed: expected type='${expected}', received type='${received}'`,
    meta: {
      expected,
      received
    }
  });
}

/**
 * Create a DataProviderNoCursorForStreamError.
 *
 * This is an expected lifecycle condition — streams have no cursor until their first successful data fetch. Severity is
 * downgraded to debug and log emission is suppressed to avoid noisy warnings during normal initialization and reactive
 * derivation cycles.
 */
function createDataProviderNoCursorForStreamError({
  streamId
}) {
  return NotFoundError.of({
    emitLog: false,
    errorCode: 'DATA_PROVIDER_NO_CURSOR_FOR_STREAM',
    message: `No cursor available for stream: ${streamId}`,
    meta: {
      streamId
    },
    severity: 'debug'
  });
}

/**
 * Create a DataProviderNoNewDataError
 */
function createDataProviderNoNewDataError({
  message = 'No new data available for the requested stream since the provided cursor',
  streamId
} = {}) {
  return EmptyResultError.of({
    errorCode: 'DATA_PROVIDER_NO_NEW_DATA',
    message,
    meta: streamId ? {
      streamId
    } : undefined
  });
}

/**
 * Create a DataProviderUnknownStreamError
 */
function createDataProviderUnknownStreamError({
  streamId
}) {
  return NotFoundError.of({
    errorCode: 'DATA_PROVIDER_UNKNOWN_STREAM',
    message: `Unknown stream: ${streamId}`,
    meta: {
      streamId
    }
  });
}

/**
 * Create a DataStreamHasNoDataError
 */
function createDataStreamHasNoDataError({
  streamId
}) {
  return EmptyResultError.of({
    errorCode: 'DATA_STREAM_HAS_NO_DATA',
    message: `No data available for stream id='${streamId}'`,
    meta: {
      streamId
    }
  });
}

/**
 * AbstractDataProvider
 *
 * Unified base for all providers.
 *
 * - Removes legacy registry-based typing/logic.
 * - Adopts getDataSource(context) as the canonical source for instance typing.
 * - Centralizes identity injection for every sample.
 * - Implements single-stream default with a per-instance stream id (overridable).
 *
 * Stream Id Policy:
 *
 * - Default: one per-instance stream id (UUID).
 * - Providers may override computeStreamIdentifiers() to supply domain-specific ids. For example:
 *
 *   - Market data provider: one UUID (accepted default)
 *   - Other providers: derive ids from the data source sample identity.
 *
 * The static-side type preserves the consumer's source and identity types.
 */
class AbstractDataProvider {
  /**
   * Concrete provider identity for this instance (derived from static's discoverIdentifiers).
   */
  identifier;

  /**
   * Human-readable name for this provider instance (subclasses set this).
   */

  /**
   * Public accessor for the data source.
   */
  get dataSource() {
    return this._dataSource;
  }

  /**
   * Public API: resolve the provider's data stream identifiers.
   *
   * - Exposes the static's dataStreamIdentifiers.
   * - Subclasses with dynamic identifiers may override this getter.
   */
  get dataStreamIdentifiers() {
    return this.staticSide.dataStreamIdentifiers;
  }

  /**
   * Default layout for this provider's streams. One pane per stream, each with an empty series array.
   *
   * The schema fills in series detail (field paths, visibility) from presenters during assembly. Multi-stream providers
   * override to group related streams into shared panes.
   */
  get defaultLayout() {
    return {
      panes: this.dataStreamIdentifiers.values().map(dataStreamIdentifier => ({
        seriesGroups: [{
          groupId: `${this.stableLayoutKey}::${dataStreamIdentifier.type}`,
          series: [],
          stableLayoutKey: this.stableLayoutKey,
          streamType: dataStreamIdentifier.type
        }]
      })).toArray()
    };
  }
  getDataState({
    dataStreamIdentifier
  }) {
    const cursor = this.getCursor({
      dataStreamIdentifier
    }).unwrapOr(undefined);
    return {
      cursor,
      dataHash: undefined,
      dataLength: undefined,
      projectionId: undefined
    };
  }
  groupIdFor({
    dataStreamIdentifier
  }) {
    return `${this.stableLayoutKey}::${dataStreamIdentifier.type}`;
  }

  /**
   * Stable identity key for layout persistence. Defaults to identifier.id, which is the domain entity ID (e.g., trade
   * position set ID, indicator template provider ID).
   */
  get stableLayoutKey() {
    return this.identifier.id;
  }
  constructor({
    dataSource,
    identifier
  }) {
    // dataSource is passed from create() after getDataSource() succeeds
    // This avoids calling getDataSource in constructor and handles Result properly
    this._dataSource = dataSource;
    this.identifier = identifier;
  }

  /**
   * Returns the provider-maintained cursor for the given stream, if available.
   */
  getCursor({
    dataStreamIdentifier: {
      id: idForCursor
    }
  }) {
    const known = this.dataStreamIdentifiers.values().some(s => s.id === idForCursor);
    if (!known) {
      return err(createDataProviderUnknownStreamError({
        streamId: idForCursor
      }));
    }
    const cursor = this.#cursorByStreamId.get(idForCursor);
    return cursor ? ok(cursor) : err(createDataProviderNoCursorForStreamError({
      streamId: idForCursor
    }));
  }

  /**
   * Returns updates for the given stream since the provided cursor.
   *
   * - Providers must NEVER return empty update sets: Err(DataProviderNoNewDataError) instead.
   * - When 'cursor' is omitted, providers may use internal cursors or perform initial backfill.
   * - Identity fields (dataProviderId/Type/StreamId) are injected automatically.
   */
  getDataSince({
    cursor,
    dataStreamIdentifier
  }) {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      // Translate cursor to time for cursor-agnostic data retrieval
      const sinceDate = cursor ? new Date(cursor.time) : undefined;
      const raw = new Set(this._dataSampleSourceRecordsSince({
        dataStreamIdentifier,
        sinceDate
      })).values();

      // Map raw records to canonical samples and inject identity using shared helper.
      const data = raw.reduce((acc, dataSampleSource) => {
        const sample = this._makeSampleFromSource({
          dataSampleSource,
          dataStreamIdentifier
        });
        return acc.add(sample);
      }, new Set());
      return this.#finalizeBatch({
        data,
        dataStreamIdentifier
      });
    });
  }

  /**
   * Return an example (latest) sample for a specific stream without advancing the internal cursor.
   */
  getExampleDataSampleForStream({
    dataStreamIdentifier
  }) {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      const raw = new Set(this._dataSampleSourceRecordsSince({
        dataStreamIdentifier
      })).values();
      const lastDataSampleSource = raw.toArray().at(-1);
      if (!lastDataSampleSource) {
        return err(createDataStreamHasNoDataError({
          streamId: dataStreamIdentifier.id
        }));
      }
      const sample = this._makeSampleFromSource({
        dataSampleSource: lastDataSampleSource,
        dataStreamIdentifier
      });
      return ok(sample);
    });
  }

  /**
   * Return example (latest) samples for all known streams without advancing cursors. Streams with no data are omitted.
   */
  getExampleDataSampleForStreams() {
    const examples = new Map();
    this.dataStreamIdentifiers.forEach(stream => {
      const res = this.getExampleDataSampleForStream({
        dataStreamIdentifier: stream
      });
      res.match({
        Ok: v => examples.set(stream.id, v),
        Err: () => {}
      });
    });
    return examples;
  }

  /**
   * Provider-specific data source (e.g., Set<Tick>).
   */
  _dataSource;

  /**
   * Access the subclass static members in a type-safe manner.
   */

  /**
   * Optional helper for subclasses to clear internal cursor state.
   */
  clearInternalCursor(args) {
    this.#cursorByStreamId.delete(args.streamId);
  }

  /**
   * Subclasses must adapt a raw record from the data source into the canonical non-identity portion of a
   * ChartDataSample. The base will inject identity fields automatically.
   */

  /**
   * Subclasses must provide an iterable over source records since an optional date.
   */

  /**
   * Create a canonical BaseChartDataSample from a provider's raw data source record. Identity fields are injected here.
   */
  _makeSampleFromSource({
    dataSampleSource,
    dataStreamIdentifier
  }) {
    const core = this._dataSampleSourceAdapter({
      dataSampleSource,
      dataStreamIdentifier
    });
    return {
      data: core.data,
      dataProviderIdentifier: this.identifier,
      dataStreamIdentifier,
      meta: core.meta,
      time: core.time,
      window: core.window
    };
  }

  /**
   * Optional helper for subclasses to set internal cursor state.
   */
  setInternalCursor(args) {
    this.#cursorByStreamId.set(args.streamId, args.cursor);
  }

  // Internal per-stream cursor store
  #cursorByStreamId = new Map();

  // Internal helpers
  #finalizeBatch({
    data,
    dataStreamIdentifier
  }) {
    if (data.size === 0) {
      return err(createDataProviderNoNewDataError({
        streamId: dataStreamIdentifier.id
      }));
    }
    const latestSample = data.values().reduce((currentLatest, sample) => {
      if (currentLatest === undefined) {
        return sample;
      }
      return sample.time.getTime() > currentLatest.time.getTime() ? sample : currentLatest;
    }, undefined);
    if (latestSample === undefined) {
      return err(createDataProviderNoNewDataError({
        streamId: dataStreamIdentifier.id
      }));
    }
    const newCursor = {
      time: latestSample.time.getTime()
    };
    this.#cursorByStreamId.set(dataStreamIdentifier.id, newCursor);
    const updates = new Set(data.values().map(sample => ({
      data: sample,
      kind: 'append'
    })));
    return ok({
      dataStreamIdentifier,
      newCursor,
      updates
    });
  }
  #validateStreamIdentifier(dataStreamIdentifier) {
    const {
      id
    } = dataStreamIdentifier;
    const known = this.dataStreamIdentifiers.values().some(s => s.id === id);
    return known ? ok(dataStreamIdentifier) : err(createDataProviderUnknownStreamError({
      streamId: id
    }));
  }
}

/**
 * Validates a data provider identifier against discovered identifiers.
 *
 * This shared utility ensures consistent validation logic across all data providers. It checks if the provided
 * identifier matches any discovered identifier and returns appropriate errors if validation fails.
 *
 * @param   identifier            - The identifier to validate
 * @param   discoveredIdentifiers - Set of valid identifiers from discoverIdentifiers()
 *
 * @returns                       Result indicating validation success or specific error (type or id mismatch)
 */
function validateDataProviderIdentifier({
  identifier,
  validIdentifiers
}) {
  // Check if the provided identifier matches any discovered identifier
  const isValid = Maybe.of(validIdentifiers.values().some(discovered => discovered.type === identifier.type && discovered.id === identifier.id));
  return isValid.match({
    Just: () => {
      return ok(true);
    },
    Nothing: () => {
      // Determine which field is invalid for a helpful error message
      const hasMatchingType = validIdentifiers.values().some(discovered => discovered.type === identifier.type);
      if (!hasMatchingType) {
        // Extract expected type(s) from discovered identifiers
        const expectedTypes = [...validIdentifiers.values()].map(d => d.type);
        const expectedType = expectedTypes[0] ?? 'unknown';
        return err(createDataProviderInvalidTypeError({
          expected: expectedType,
          received: identifier.type
        }));
      }

      // If type matches but id doesn't, it's an invalid id
      const expectedIds = [...validIdentifiers.values()].map(d => d.id);
      const expectedId = expectedIds[0] ?? 'unknown';
      return err(createDataProviderInvalidIdError({
        expected: expectedId,
        received: identifier.id
      }));
    }
  });
}

/**
 * Check if two DataStreamIdentifier objects are equal.
 *
 * Performs deep equality check on all four identifier fields: dataProviderIdentifier.type, dataProviderIdentifier.id,
 * type, and id.
 */

/**
 * Type guard for CompleteLeafStructuralDescriptor
 */
function isCompleteLeafStructuralDescriptor(descriptor) {
  return descriptor.kind === 'series' && 'seriesKind' in descriptor;
}

/**
 * Type guard for BranchStructuralDescriptor
 */
function isBranchStructuralDescriptor(descriptor) {
  return descriptor.kind === 'structural';
}

/**
 * Recursively search a descriptor tree for a descriptor matching the given fieldPath.
 *
 * Returns the matched descriptor and its parent (if nested under a branch), or undefined if not found.
 */
function findDescriptorWithParent({
  descriptors,
  fieldPath,
  parent
}) {
  for (const descriptor of descriptors) {
    if (descriptor.identifier.fieldPath === fieldPath) {
      return {
        descriptor,
        parent
      };
    }
    if (isBranchStructuralDescriptor(descriptor)) {
      const found = findDescriptorWithParent({
        descriptors: descriptor.children,
        fieldPath,
        parent: descriptor
      });
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Label Utilities
 *
 * Provides utility functions for generating labels for chart series and panes. Implements redundancy removal logic to
 * create clean, readable labels from hierarchical data structure (Provider → Stream → Field).
 *
 * Key functions:
 *
 * - BuildSeriesLabel: Generate full hierarchical label with redundancy removal
 * - BuildSeriesTitle: Generate abbreviated title for native series title property
 * - BuildPaneLabel: Generate pane label with special handling for first pane
 */


/**
 * BuildPaneLabelArgs
 *
 * Arguments for building a pane label.
 */

/**
 * BuildSeriesLabelArgs
 *
 * Arguments for building a series label.
 */

/**
 * BuildSeriesTitleArgs
 *
 * Arguments for building a series title (abbreviated).
 */

/**
 * Build a pane label with special handling for the first pane.
 *
 * First pane pattern: {InstrumentName} | {SeriesLabel} [timeframe] Other panes pattern: {SeriesLabel}
 * [timeframe]
 *
 * Examples:
 *
 * - First pane: "Instrument | Market data - ohlc [1m]"
 * - Other panes: "Trend - macd [5m]"
 */
function buildPaneLabel(args) {
  const seriesLabel = buildSeriesLabel({
    fieldDescriptor: args.fieldDescriptor,
    parentDescriptor: args.parentDescriptor,
    providerName: args.providerName,
    streamType: args.streamType
  });
  let label;
  if (args.isFirstPane && args.tradableAssetPairName) {
    label = `${args.tradableAssetPairName} | ${seriesLabel}`;
  } else {
    label = seriesLabel;
  }

  // Append timeframe in brackets if provided
  if (args.timeframeLabel) {
    label = `${label} [${args.timeframeLabel}]`;
  }
  return label;
}

/**
 * Build a full hierarchical series label with redundancy removal.
 *
 * Pattern: {ProviderName} - {StreamType} - {FieldLabel} with redundancy removal applied. For structural field children,
 * combines parent and child as "Parent > Child".
 *
 * Examples:
 *
 * - Market data - ohlc (was: Market data - ohlc - OHLC)
 * - Market data - Volume > Buy (for faceted volume.buy)
 * - Market data - Counts > Total (for faceted counts.total)
 * - Trend - EMA (was: Trend - ema - EMA)
 * - Trend - macd - Histogram (was: Trend - macd - MACD - Histogram)
 */
function buildSeriesLabel(args) {
  const fieldLabel = args.fieldDescriptor.label || inferFieldLabelFromPath(args.fieldDescriptor.identifier.fieldPath);
  const parentLabel = args.parentDescriptor?.label;

  // If this is a child of a structural field, combine parent and child
  const isStructuralChild = parentLabel && args.parentDescriptor && isBranchStructuralDescriptor(args.parentDescriptor);
  const combinedFieldLabel = isStructuralChild ? `${parentLabel} > ${fieldLabel}` : fieldLabel;
  const components = removeRedundancy({
    fieldLabel: combinedFieldLabel,
    parentLabel: isStructuralChild ? parentLabel : undefined,
    providerName: args.providerName,
    streamType: args.streamType
  });
  return components.join(' - ');
}

/**
 * Build an abbreviated series title for the native LightweightCharts title property.
 *
 * Rules:
 *
 * - Structural field children: Use "Parent > Child" format (e.g., "Volume > Buy", "Trades > Total")
 * - Non-structural fields: Use the field label (e.g., "OHLC", "EMA 20")
 *
 * Examples:
 *
 * - "OHLC"
 * - "EMA 20"
 * - "Volume > Buy" (for volume.buy)
 * - "Traders > Total" (for traders.total)
 */
function buildSeriesTitle(args) {
  const childLabel = args.fieldDescriptor.label || inferFieldLabelFromPath(args.fieldDescriptor.identifier.fieldPath);

  // If this is a child of a structural field, use "Parent > Child" format
  if (args.parentDescriptor && isBranchStructuralDescriptor(args.parentDescriptor)) {
    const parentLabel = args.parentDescriptor.label || inferFieldLabelFromPath(args.parentDescriptor.identifier.fieldPath);
    return `${parentLabel} > ${childLabel}`;
  }

  // Otherwise use the field label as-is
  return childLabel;
}

/**
 * Extract provider name from a data provider identifier.
 *
 * For now, this uses the provider type. In the future, we might want to use a more descriptive name from the provider
 * instance itself.
 */

function humanizeChartFieldLabel({
  fieldName
}) {
  return startCase(fieldName);
}

/**
 * Infer a field label from its path when no explicit label is provided.
 *
 * Examples:
 *
 * - Data.fooBar → Foo Bar
 * - Data.ohlc → OHLC
 * - Meta.timestamp → Timestamp
 */
function inferFieldLabelFromPath(fieldPath) {
  // Extract the field name after 'data.' or 'meta.'
  const parts = fieldPath.split('.');
  const fieldName = parts[parts.length - 1];
  if (!fieldName) {
    return '';
  }
  return humanizeChartFieldLabel({
    fieldName
  });
}

/**
 * Check if two strings are exactly equal (case-insensitive)
 */
function isExactMatch(a, b) {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

/**
 * Normalize text for comparison (case-insensitive, trimmed)
 */
function normalizeForComparison(text) {
  return text.trim().toLowerCase();
}

/**
 * Remove redundancy from label components according to the task specification.
 *
 * Rules:
 *
 * 1. If streamType and fieldLabel are identical, drop streamType (only include fieldLabel)
 * 2. If parentLabel matches streamType (for structural children), drop streamType (fieldLabel already includes "Parent >
 *    Child")
 * 3. Otherwise include all non-redundant components
 */
function removeRedundancy(args) {
  const components = [args.providerName];

  // Check if stream type matches field label (case-insensitive exact match)
  const streamTypeMatchesField = isExactMatch(args.streamType, args.fieldLabel);

  // For structural children with "Parent > Child" format, check if parent matches stream type
  const parentMatchesStreamType = args.parentLabel ? isExactMatch(args.parentLabel, args.streamType) : false;

  // Build the component list based on redundancy rules
  if (streamTypeMatchesField) {
    // Rule 1: Stream type and field label are identical
    // Include only: Provider - Field
    components.push(args.fieldLabel);
  } else if (parentMatchesStreamType) {
    // Rule 2: Parent matches stream type (for structural children)
    // Include only: Provider - Field (where Field is "Parent > Child")
    components.push(args.fieldLabel);
  } else {
    // No redundancy
    // Include: Provider - StreamType - Field
    components.push(args.streamType);
    components.push(args.fieldLabel);
  }
  return components;
}

/**
 * AbstractDataStreamPresenter
 *
 * Provides tracked descriptor caching, seeding, and default field selection logic. Subclasses must implement describing
 * and projecting; all shape reads should be side-effect free.
 *
 * Pipeline architecture:
 *
 * - DescribeFields() [concrete] - Orchestrates the full pipeline:
 *
 *   1. Calls _describeDataFields() for data field descriptors
 *   2. Calls _describeMetaFieldChildren() for meta field children (raw, not wrapped)
 *   3. Infers missing meta fields from sample data (fallback)
 *   4. Wraps meta children in structural "Meta" node
 *   5. Returns combined data + wrapped meta
 * - _describeDataFields() [abstract] - Subclass returns data field descriptors
 * - _describeMetaFieldChildren() [abstract] - Subclass returns raw meta children (NOT wrapped in structural node)
 *
 * Descriptors are seeded once at construction from the optional example sample. No enrichment happens during projection
 * (YAGNI - we don't anticipate sparse data streams without data at init).
 *
 * Configurability via isConfigurable:
 *
 * The `isConfigurable` discriminator determines whether the presenter's data source supports configuration:
 *
 * - If `isConfigurable: true` → `getStreamDataSource()` returns a data source with `config` property
 * - If `isConfigurable: false` → `getStreamDataSource()` returns a data source without `config` property
 *
 * Subclasses MUST implement `isConfigurable` and `getStreamDataSource()` to satisfy the DataStreamPresenterLike
 * discriminated union. The abstract class does not implement DataStreamPresenterLike directly (TypeScript cannot
 * implement union types), but concrete subclasses must satisfy one branch of the union.
 *
 * Consumer types are preserved directly through the provider, stream, and data-source parameters.
 */
class AbstractDataStreamPresenter {
  /**
   * The data provider instance that owns this presenter's data stream.
   */
  get dataProvider() {
    return this._dataProvider;
  }

  /**
   * The data stream identifier for this presenter.
   */
  get dataStreamIdentifier() {
    return this._dataStreamIdentifier;
  }

  /**
   * Default field selection derived from descriptors (no samples, no fetch).
   */
  get defaultSeries() {
    // Use cached descriptors for default selection
    const rootDescriptors = this.structuralDescriptors;
    const selections = new Set();
    const isSeries = d => d.kind === 'series';
    const isStructural = d => d.kind === 'structural';
    const selectFromStructural = struct => {
      // Meta groups are auxiliary information - don't auto-select
      const fieldPath = struct.identifier.fieldPath;
      if (fieldPath === 'meta' || fieldPath.startsWith('meta.')) return;
      const seriesChildren = Array.from(struct.children).filter(isSeries);
      if (seriesChildren.length === 0) return;
      const chosen = seriesChildren.find(c => c.identifier.fieldPath.endsWith('.total')) ?? seriesChildren[0];
      if (!chosen) return;
      selections.add(chosen.identifier.fieldPath);
    };
    const visit = (descriptor, parentStructural) => {
      if (isStructural(descriptor)) {
        // Choose one representative child for this group
        selectFromStructural(descriptor);

        // Recurse to nested structural groups
        for (const child of descriptor.children) {
          if (isStructural(child)) visit(child, true);
        }
      } else {
        // Top-level series (not under structural parent): include if under 'data.'
        if (!parentStructural && descriptor.identifier.fieldPath.startsWith('data.')) {
          selections.add(descriptor.identifier.fieldPath);
        }
      }
    };
    for (const d of rootDescriptors) visit(d, false);
    return selections;
  }

  /**
   * Default layout fragment for this presenter's data stream.
   *
   * Produces a single pane with a single series group containing all known series fields. Visibility is determined by
   * `defaultSeries` — fields in that set are visible, all others are hidden.
   *
   * Subclasses MAY override to produce multi-pane or multi-group layouts when their data naturally maps to separate
   * panes (e.g., OHLC in main pane, volume in a separate pane).
   */
  get defaultLayout() {
    const visiblePaths = this.defaultSeries;
    const allSeriesPaths = this.#collectAllSeriesPaths({
      descriptors: this.structuralDescriptors
    });
    const series = allSeriesPaths.values().map(fieldPath => ({
      fieldPath,
      visible: visiblePaths.has(fieldPath)
    })).toArray();
    return {
      panes: [{
        seriesGroups: [{
          groupId: `${this._dataStreamIdentifier.dataProviderIdentifier.id}::${this._dataStreamIdentifier.type}`,
          series,
          stableLayoutKey: this._dataStreamIdentifier.dataProviderIdentifier.id,
          streamType: this._dataStreamIdentifier.type
        }]
      }]
    };
  }

  /**
   * Whether this presenter's data stream supports configuration.
   *
   * Subclasses MUST implement this to satisfy the DataStreamPresenterLike discriminated union:
   *
   * - If the presenter has a configurable data source → return `true`
   * - If the presenter has no data source → return `false`
   *
   * This discriminator enables TypeScript to narrow the return type of `getStreamDataSource()`.
   */

  /**
   * Human-readable name for the provider that owns this data stream.
   */
  get providerName() {
    return this._dataProvider.name;
  }

  /**
   * Read-only view of the tracked cache, returning only root-level descriptors.
   *
   * Filters out descriptors that are children of structural nodes to avoid duplicate display in the UI. Children are
   * accessible via their parent structural descriptor's `children` property.
   *
   * The generic type parameter preserves the specific DataStreamIdentifier type from the presenter's TArgs.
   */
  get structuralDescriptors() {
    const allDescriptors = Array.from(this._structuralDescriptorsMap.values());

    // Collect all field paths that are children of structural descriptors
    const childFieldPaths = new Set();
    for (const descriptor of allDescriptors) {
      if (descriptor.kind === 'structural') {
        // Recursively collect all children field paths
        const collectChildPaths = children => {
          for (const child of children) {
            childFieldPaths.add(child.identifier.fieldPath);
            if (child.kind === 'structural') {
              collectChildPaths(child.children);
            }
          }
        };
        collectChildPaths(descriptor.children);
      }
    }

    // Return only root-level descriptors (not children of structural nodes)
    return new Set(allDescriptors.filter(descriptor => !childFieldPaths.has(descriptor.identifier.fieldPath)));
  }

  /**
   * Human-readable name for this data stream. Subclasses must implement this reactive getter.
   */

  constructor({
    dataProvider,
    dataStreamIdentifier
  }) {
    this._dataProvider = dataProvider;
    this._dataStreamIdentifier = dataStreamIdentifier;

    // Fetch example sample internally from provider
    const exampleResult = this._dataProvider.getExampleDataSampleForStream({
      dataStreamIdentifier
    });
    this._exampleDataSample = exampleResult.unwrapOr(undefined);

    // NOTE: Subclasses MUST call _initializeDescriptors() at the end of their constructor
    // after all their fields are initialized. This is not called here because subclasses
    // may need to set up additional state (e.g., delegate presenters) before describeFields() is called.
  }

  /**
   * Describe all fields for this data stream.
   *
   * Concrete implementation that orchestrates the full pipeline:
   *
   * 1. Get data fields from subclass
   * 2. Get meta field children from subclass
   * 3. Infer missing meta fields from sample (fallback)
   * 4. Wrap meta in structural "Meta" node
   * 5. Return combined result
   *
   * The generic type parameter preserves the specific DataStreamIdentifier type from the presenter's TArgs.
   */
  describeFields() {
    // 1. Get data fields from subclass
    const dataFields = this._describeDataFields();

    // 2. Get meta field children from subclass (raw, not wrapped)
    const presenterMetaChildren = this._describeMetaFieldChildren();

    // 3. Collect paths already covered by presenter
    const coveredPaths = new Set();
    presenterMetaChildren.forEach(descriptor => {
      this.#collectFieldPaths({
        descriptor,
        paths: coveredPaths
      });
    });

    // 4. Infer missing meta fields from sample (fallback)
    const metaObject = this._exampleDataSample?.meta ?? {};
    const inferredMetaChildren = this.#inferMissingMetaFields({
      coveredPaths,
      metaObject,
      pathPrefix: 'meta'
    });

    // 5. Combine presenter + inferred meta children
    const allMetaChildren = new Set([...inferredMetaChildren, ...presenterMetaChildren]);

    // 6. If no meta children, return just data fields
    if (allMetaChildren.size === 0) {
      return dataFields;
    }

    // 7. Wrap meta children in structural "Meta" node
    const metaStructural = {
      children: allMetaChildren,
      kind: 'structural',
      label: 'Meta',
      structuralGroupType: 'faceted',
      identifier: {
        dataStreamIdentifier: this._dataStreamIdentifier,
        fieldPath: 'meta'
      }
    };

    // 8. Return combined data + wrapped meta, with data fields first so primary
    // stream series appear before auxiliary Meta fields in selector/tree UIs.
    const orderedDescriptors = new Set(dataFields);
    orderedDescriptors.add(metaStructural);
    return orderedDescriptors;
  }

  /**
   * Get the data source for this data stream.
   *
   * Subclasses MUST implement this to satisfy the DataStreamPresenterLike discriminated union:
   *
   * - If configurable → return `Result.ok(dataSource)` where dataSource satisfies `HasConfigValues`
   * - If not configurable → return `Result.ok(dataSource)` where dataSource is the stream's data source (no config)
   *
   * The `isConfigurable` discriminator enables type narrowing at the interface level.
   */

  projectField({
    dataSamples,
    fieldPath
  }) {
    // Delegate to subclass hook for actual projection
    // No descriptor enrichment during projection (YAGNI - descriptors are fully seeded at construction)
    return this._projectFieldImplementation({
      dataSamples,
      fieldPath
    });
  }

  /**
   * Protected data provider for subclasses.
   */
  _dataProvider;

  /**
   * Protected stream identifier for subclasses.
   */
  _dataStreamIdentifier;

  /**
   * Protected example data sample for descriptor inference (if available).
   */
  _exampleDataSample;

  /**
   * Tracked cache keyed by fieldPath for efficient lookups and UI reactivity. We store BOTH structural and series
   * descriptors so we can traverse the hierarchy from cached roots.
   */
  _structuralDescriptorsMap = trackedMap();

  /**
   * Describe data fields for this data stream.
   *
   * Subclasses return their data field descriptors (e.g., OHLC, volume, indicator values). These are returned directly
   * without additional processing.
   */

  /**
   * Describe meta field children for this data stream.
   *
   * Subclasses return raw meta field descriptors (NOT wrapped in structural "Meta" node). The base class pipeline will:
   *
   * - Infer any missing meta fields from sample data
   * - Wrap all meta children in a structural "Meta" node
   *
   * Return an empty set if this stream has no meta fields.
   */

  /**
   * Seed static descriptors using the example sample (if available). Subclasses may override to add extra static setup,
   * but should call super.
   */
  _ensureStaticSeriesFieldsDescriptors() {
    const descriptors = this.describeFields();
    this._mergeDescriptorsIntoCache({
      descriptors
    });
  }

  /**
   * Format field key into human-readable label.
   *
   * Splits camelCase and capitalizes words. E.g., 'bullishCrossover' → 'Bullish Crossover'.
   *
   * @param   key - Field key to format
   *
   * @returns     Human-readable label
   */
  _formatLabel(key) {
    return humanizeChartFieldLabel({
      fieldName: key
    });
  }

  /**
   * Format meta field label with 'is' prefix stripping for booleans.
   *
   * Converts 'isBullishCrossover' → 'Bullish Crossover', 'highest' → 'Highest'.
   *
   * @param   key - Field key to format
   *
   * @returns     Human-readable label
   */
  _formatMetaFieldLabel(key) {
    const withoutIs = this._stripIsPrefix(key);
    return this._formatLabel(withoutIs);
  }

  /**
   * Infer series kind from value type.
   *
   * Used by fallback inference when presenter doesn't define explicit seriesKind.
   *
   * @param   value - The value to inspect
   *
   * @returns       Inferred series type
   */
  _inferSeriesKindFromValue(value) {
    switch (typeof value) {
      case 'boolean':
        return 'baseline';
      // Boolean values rendered as 0/1 baseline

      case 'number':
        return 'line';
      default:
        // For objects or other types, default to line (will be handled recursively if nested)
        return 'line';
    }
  }

  /**
   * Initialize descriptors by seeding from describeFields().
   *
   * Subclasses MUST call this at the end of their constructor after all fields are initialized. This is not called
   * automatically in the base constructor because subclasses may need to set up additional state before
   * describeFields() can be called.
   */
  _initializeDescriptors() {
    this._ensureStaticSeriesFieldsDescriptors();
  }

  /**
   * Merge descriptors into cache. Stores both structural and series nodes; recurses structural children.
   */
  _mergeDescriptorsIntoCache({
    descriptors
  }) {
    for (const descriptor of descriptors) {
      this._structuralDescriptorsMap.set(descriptor.identifier.fieldPath, descriptor);
      if (descriptor.kind === 'structural') {
        this._mergeDescriptorsIntoCache({
          descriptors: descriptor.children
        });
      }
    }
  }

  /**
   * Subclass hook for projection. Implementors should project the requested field using the provided samples.
   */

  /**
   * Strip 'is' prefix from field names for boolean fields.
   *
   * Converts 'isBullishCrossover' → 'BullishCrossover'. Only strips when followed by uppercase letter.
   *
   * @param   key - Field name to process
   *
   * @returns     Field name with 'is' prefix stripped if applicable
   */
  _stripIsPrefix(key) {
    if (key.startsWith('is') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
      return key.slice(2);
    }
    return key;
  }

  /**
   * Recursively collect all field paths from a descriptor tree.
   *
   * Used to track which paths are already covered by presenter-defined descriptors.
   */
  #collectFieldPaths({
    descriptor,
    paths
  }) {
    paths.add(descriptor.identifier.fieldPath);
    if (descriptor.kind === 'structural') {
      descriptor.children.forEach(child => {
        this.#collectFieldPaths({
          descriptor: child,
          paths
        });
      });
    }
  }

  /**
   * Infer meta field descriptors for fields NOT already covered by the presenter.
   *
   * Recursively inspects the meta object and creates generic descriptors for uncovered fields. This ensures data
   * integrity - new meta fields won't be silently dropped when presenters drift out of sync with the data source.
   */
  #inferMissingMetaFields({
    coveredPaths,
    depth = 0,
    metaObject,
    pathPrefix
  }) {
    // Safety: limit recursion depth
    if (depth > 10) {
      return new Set();
    }
    return Object.keys(metaObject).reduce((descriptors, key) => {
      const fieldPath = `${pathPrefix}.${key}`;
      const value = metaObject[key];

      // Skip if already covered by presenter
      if (coveredPaths.has(fieldPath)) {
        return descriptors;
      }

      // Skip non-renderable types
      if (value instanceof Date || value === null || value === undefined) {
        return descriptors;
      }

      // Handle nested objects recursively
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedObject = value;
        const nestedKeys = Object.keys(nestedObject);
        if (nestedKeys.length > 0) {
          const children = this.#inferMissingMetaFields({
            coveredPaths,
            depth: depth + 1,
            metaObject: nestedObject,
            pathPrefix: fieldPath
          });
          if (children.size > 0) {
            return descriptors.add({
              children,
              kind: 'structural',
              label: this._formatMetaFieldLabel(key),
              structuralGroupType: 'faceted',
              identifier: {
                dataStreamIdentifier: this._dataStreamIdentifier,
                fieldPath
              }
            });
          }
        }
        return descriptors;
      }

      // Leaf field - infer series kind from value type
      const seriesKind = this._inferSeriesKindFromValue(value);
      const label = this._formatMetaFieldLabel(key);
      return descriptors.add({
        kind: 'series',
        label,
        seriesKind,
        identifier: {
          dataStreamIdentifier: this._dataStreamIdentifier,
          fieldPath
        }
      });
    }, new Set());
  }

  /**
   * Recursively collect all series field paths from a set of descriptors.
   *
   * Walks structural nodes to extract leaf series paths for layout assembly.
   */
  #collectAllSeriesPaths({
    descriptors
  }) {
    return descriptors.values().reduce((paths, descriptor) => {
      if (descriptor.kind === 'series') {
        paths.add(descriptor.identifier.fieldPath);
      } else {
        const childPaths = this.#collectAllSeriesPaths({
          descriptors: descriptor.children
        });
        for (const path of childPaths) {
          paths.add(path);
        }
      }
      return paths;
    }, new Set());
  }
}

/**
 * Error when no series adapter is registered for the requested series type.
 *
 * This indicates the series type is not supported by the current adapter registry.
 */

/**
 * Create a NoSeriesAdapterForTypeError
 */
function createNoSeriesAdapterForTypeError({
  seriesType
}) {
  return NotFoundError.of({
    errorCode: 'NO_SERIES_ADAPTER_FOR_TYPE',
    message: `No series adapter registered for type: ${seriesType}`,
    meta: {
      seriesType
    }
  });
}

function validateSeriesNumber(value) {
  if (isFiniteNumber(value)) return ok(value);
  return err(ValidationError.of({
    errorCode: 'SERIES_VALUE_NUMBER_INVALID',
    message: 'A scalar series value must be a finite number.',
    emitLog: false
  }));
}
function validateSeriesOhlc(value) {
  if (value && typeof value === 'object' && 'open' in value && isFiniteNumber(value.open) && 'high' in value && isFiniteNumber(value.high) && 'low' in value && isFiniteNumber(value.low) && 'close' in value && isFiniteNumber(value.close)) {
    return ok({
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close
    });
  }
  return err(ValidationError.of({
    errorCode: 'SERIES_VALUE_OHLC_INVALID',
    message: 'An OHLC series value must contain four finite numbers.',
    emitLog: false
  }));
}

/** The default validates numeric values; it never unwraps consumer domain objects. */
const numericSeriesValueHandler = {
  id: 'numeric',
  toNumber: validateSeriesNumber,
  toOhlc: validateSeriesOhlc
};

/** Interpret a non-empty batch before mutating an upstream series. */
function interpretProjectedPoints({
  points,
  handler,
  seriesKind
}) {
  if (points.size === 0) {
    return err(EmptyResultError.of({
      errorCode: 'SERIES_VALUE_POINTS_EMPTY',
      message: 'There are no projected points to interpret.',
      emitLog: false
    }));
  }
  return all(points.values().map(point => interpretProjectedPoint({
    point,
    handler,
    seriesKind
  })).toArray()).map(interpreted => new Set(interpreted));
}
function interpretProjectedPoint({
  point,
  handler,
  seriesKind
}) {
  if (seriesKind === 'bar' || seriesKind === 'candlestick') {
    if (handler.toOhlc === undefined) {
      return err(PreconditionError.of({
        errorCode: 'SERIES_VALUE_OHLC_CONVERTER_MISSING',
        message: 'The selected value handler does not support OHLC series.',
        meta: {
          handlerId: handler.id
        },
        emitLog: false
      }));
    }
    return handler.toOhlc(point.value).andThen(validateSeriesOhlc).map(value => ({
      time: point.time,
      value
    }));
  }
  return handler.toNumber(point.value).andThen(validateSeriesNumber).map(value => ({
    time: point.time,
    value
  }));
}
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Base SeriesAdapter interface and supporting types.
 *
 * Goals:
 *
 * - Bottom-up authority: adapters define their own `id` (internal lowercase) and `seriesType` (external LWC literal).
 * - Object-arg functions for clarity and extensibility: create({ ctx, options }), backfill({ api, data }), update({ api,
 *   data }).
 * - Set-based backfill data for homogeneous collections; adapters convert Set -> Array at the LWC boundary.
 *
 * Adapters should not import from this module cyclically (keep adapter implementations decoupled).
 */

/**
 * Optional shape for registry entries: ties the external series type to its adapter. Useful when building a
 * programmatic registry from a tuple of adapters.
 */

/**
 * Arguments for applying options to an existing series.
 */

/**
 * Backfill arguments expect a ReadonlySet of homogeneous data.
 */

/**
 * Base options shared by all series adapters.
 *
 * Uses `name` as our internal term; adapters translate to LWC's `title` at the boundary.
 */

/**
 * A single numeric value at a point in time. Suitable for numeric series: line, area, histogram.
 */

/**
 * Args for creating a series.
 *
 * TOptions: adapter-specific options type (extends BaseSeriesOptions) TContext: adapter-specific creation context
 * (e.g., chart API, pane index)
 */

/**
 * LWC options shape after translation from internal options.
 *
 * Replaces our internal `name` field with LWC's `title` field.
 */

/**
 * Union of all LWC series options types.
 */

/**
 * Base SeriesAdapter contract.
 *
 * TInternal: internal lowercase key (e.g., 'area') TExternal: external LWC series type literal (e.g., 'Area') TOptions:
 * adapter-specific options type TCreateCtx: adapter-specific creation context type TBackfillDatum: datum type for
 * backfill (Set-based) TUpdateDatum: datum type for updates (single)
 *
 * Notes:
 *
 * - Methods are synchronous by default; if you need richer error handling, return a Result type in the concrete adapters.
 * - Keep adapters decoupled from UI state; they should be pure boundaries to LWC.
 */

/**
 * Helper alias for working with heterogeneous adapter collections (e.g., registries).
 */

/**
 * Series adapter with descriptor brand, using TOpts pattern.
 *
 * Example usage:
 *
 * ```ts
 * const areaAdapter: SeriesAdapterWithDescriptor<{
 *   internal: 'area';
 *   external: 'Area';
 *   options: AreaSeriesOptions;
 *   datum: AreaPoint;
 *   descriptor: AreaSeriesDescriptor;
 * }> = { ... };
 * ```
 *
 * If backfill and update need different datum types (rare), specify `updateDatum`:
 *
 * ```ts
 * const customAdapter: SeriesAdapterWithDescriptor<{
 *   internal: 'custom';
 *   external: 'Custom';
 *   options: CustomSeriesOptions;
 *   datum: BackfillPoint;
 *   updateDatum: UpdatePoint;
 *   descriptor: CustomSeriesDescriptor;
 * }> = { ... };
 * ```
 */

/**
 * TOpts shape for SeriesAdapterWithDescriptor.
 *
 * Uses TOpts pattern (complete specification) with optional `updateDatum` that defaults to `datum` when not specified.
 * This eliminates the common duplication where backfill and update use the same datum type.
 */

/**
 * Union-friendly alias for a series API bound to any supported LWC series type.
 */

/**
 * Args for applying incremental updates to a series.
 *
 * TExternal: the external LWC series type literal (e.g., 'Area') TDatum: the adapter-specific datum type for an update
 */

/**
 * Resolves the create context type from TOpts.
 *
 * If `createContext` is specified in TOpts, uses that; otherwise falls back to CreateSeriesArgsContext.
 */

/**
 * Resolves the update datum type from TOpts.
 *
 * If `updateDatum` is specified in TOpts, uses that; otherwise falls back to `datum`.
 */

/**
 * Translate internal options (with `name`) to LWC options (with `title`).
 *
 * Removes the `name` field and adds the `title` field. This keeps our internal API consistent (using `name`) while
 * adapting to LWC's terminology (`title`) at the boundary.
 *
 * Generic over `TLwcOptions`: Constrained to the union of known LWC series options types. TypeScript infers this from
 * the call-site context (e.g., `seriesApi.applyOptions(translateOptionsToLwc(options))`).
 *
 * Always returns `DeepPartial<TLwcOptions>` (never `undefined`) to be compatible with LWC's `applyOptions` and
 * `addSeries` signatures. When input options are `undefined`, returns an empty object which is valid for `DeepPartial`
 * (all properties optional).
 */
function translateOptionsToLwc(options) {
  if (!options) return {};
  const {
    name,
    ...rest
  } = options;
  return {
    ...rest,
    title: name
  };
}

/**
 * Adapter-side LWC converter helpers.
 *
 * These helpers live behind the adapter boundary to keep Lightweight Charts (LWC) coupling out of providers. Adapters
 * use these utilities to convert provider-agnostic primitives into LWC-friendly payloads.
 *
 * Conventions:
 *
 * - Provider-side primitives (time-series points) use Date for time.
 * - Adapters convert Date -> UTCTimestamp (seconds) using toLwcTime().
 * - Backfill containers should be ReadonlySet<T>; adapters convert Set -> Array at the boundary.
 *
 * Notes:
 *
 * - Helpers are minimal and structural to remain assignable to LWC data types (e.g., LineData, AreaData, HistogramData,
 *   CandlestickData).
 */

function sortTimeSeriesPointsAscending({
  points
}) {
  return Array.from(points).toSorted((left, right) => left.time.getTime() - right.time.getTime());
}

/**
 * Minimal numeric data shape accepted by LWC numeric series (line/area/histogram). Kept lightweight to be assignable to
 * LineData/AreaData/HistogramData structurally.
 */

/**
 * Convert a Set of numeric points into an Array of LWC numeric data points. Adapters should use this to map provider
 * backfill (ReadonlySet) to LWC arrays.
 */
function mapNumberSetToLwcArray(points) {
  return sortTimeSeriesPointsAscending({
    points
  }).values().map(numberPointToLwc).toArray();
}

/**
 * Convert a Set of OHLC points into an Array of LWC CandlestickData points.
 */
function mapOhlcSetToCandles(points) {
  return sortTimeSeriesPointsAscending({
    points
  }).values().map(ohlcPointToLwc).toArray();
}
function sortNumberPointsAscending({
  points
}) {
  return sortTimeSeriesPointsAscending({
    points
  });
}
function sortOhlcPointsAscending({
  points
}) {
  return sortTimeSeriesPointsAscending({
    points
  });
}

/**
 * Convert a numeric point into an LWC numeric data point.
 */
function numberPointToLwc(point) {
  return {
    ...point,
    time: toLwcTime(point.time)
  };
}

/**
 * Convert an OHLC point to an LWC CandlestickData point.
 */
function ohlcPointToLwc({
  time,
  value
}) {
  return {
    close: value.close,
    high: value.high,
    low: value.low,
    open: value.open,
    time: toLwcTime(time)
  };
}

/**
 * Convert a Date to Lightweight Charts UTCTimestamp (seconds since epoch).
 */
function toLwcTime(date) {
  return Math.floor(date.getTime() / 1000);
}

/**
 * CSS Color Utilities
 *
 * Utilities for reading CSS variables and converting CSS color values (including modern formats like oklch()) to
 * hex/rgba format. Useful when passing theme colors to canvas-based libraries that do not support modern CSS color
 * syntax.
 *
 * SSR-safe: all functions return the input/fallback unchanged when `document` is unavailable.
 */

/**
 * Convert any CSS color value to hex or rgba format.
 *
 * Uses a temporary canvas element to convert the color, which handles any valid CSS color including oklch() and other
 * modern formats that canvas-based libraries may not support.
 */
function cssColorToHex(cssColor) {
  if (typeof document === 'undefined') return cssColor;

  // If already hex, return as-is
  if (cssColor.startsWith('#')) return cssColor;

  // Use canvas to convert any CSS color to rgba, then to hex
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const imageData = ctx.getImageData(0, 0, 1, 1).data;
  const r = imageData[0];
  const g = imageData[1];
  const b = imageData[2];
  const a = imageData[3];

  // Handle alpha channel
  if (a !== undefined && a < 255) {
    const alpha = Math.round(a / 255 * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Convert to hex
  const toHex = n => (n ?? 0).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Read a CSS variable value from the document root and convert to hex/rgba.
 *
 * Returns the computed value converted via `cssColorToHex`, or `fallback` if the variable is not set or `document` is
 * unavailable.
 */
function getCssVar(varName, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value) return fallback;
  return cssColorToHex(value);
}

/**
 * Chart Theme
 *
 * Provides lightweight-charts theme options derived from CSS variables. This allows the chart to automatically adapt to
 * whatever Frontile theme is active.
 *
 * Since lightweight-charts renders to canvas, it cannot use CSS variables directly. This utility reads the computed CSS
 * variable values at runtime and returns a configuration object compatible with lightweight-charts.
 *
 * IMPORTANT: lightweight-charts only supports hex/rgb/rgba colors, not oklch(). We must convert all CSS variable values
 * to hex format before passing to the chart library.
 *
 * Usage:
 *
 * ```ts
 * import { getChartTheme } from "./chart-theme";
 *
 * const chart = createChart(element, {
 *   ...getChartTheme(),
 *   // other options...
 * });
 * ```
 */


/**
 * CSS variable names used by Frontile themes. These are set on :root by the active theme.
 */
const CSS_VARS = {
  // Backgrounds
  background: '--color-background',
  brand: '--color-brand',
  danger: '--color-danger',
  // Borders/dividers
  divider: '--color-divider',
  // Highlights
  highlightSoft: '--color-highlight-soft',
  neutralMedium: '--color-neutral-medium',
  neutralSoft: '--color-neutral-soft',
  // Semantic colors
  success: '--color-success',
  // Overlays (for subtle dividers)
  surfaceOverlaySoft: '--color-surface-overlay-soft'};

/**
 * Get candlestick series options with theme colors.
 */
function getCandlestickColors() {
  const {
    downColor,
    upColor
  } = getSeriesColors();
  return {
    borderDownColor: downColor,
    borderUpColor: upColor,
    downColor,
    upColor,
    wickDownColor: downColor,
    wickUpColor: upColor
  };
}

/**
 * Get chart theme options derived from current CSS variables.
 *
 * Call this when creating the chart to get theme-aware colors. If CSS variables change (theme switch), you'll need to
 * recreate the chart or call chart.applyOptions() with fresh theme values.
 */
function getChartTheme() {
  // Read current CSS variable values
  const background = getCssVar(CSS_VARS.background, '#282A36');
  const textColor = getCssVar(CSS_VARS.neutralMedium, '#F8F8F2c4');
  // Use divider color for consistency with edge-panel and other UI components
  const dividerColor = getCssVar(CSS_VARS.divider, '#44475A');
  // Use overlay-soft for subtle grid lines within panes (less prominent than dividers)
  const gridColor = getCssVar(CSS_VARS.surfaceOverlaySoft, '#ffffff0f');
  // Use brand color for pane separators to signal interactive resize affordance.
  const paneSeparatorColor = getCssVar(CSS_VARS.brand, '#BD93F9');
  const paneSeparatorHoverColor = getCssVar(CSS_VARS.brand, '#BD93F9');
  const crosshairColor = getCssVar(CSS_VARS.neutralSoft, '#F8F8F24f');
  return {
    crosshair: {
      horzLine: {
        color: crosshairColor,
        labelBackgroundColor: background
      },
      vertLine: {
        color: crosshairColor,
        labelBackgroundColor: background
      }
    },
    grid: {
      horzLines: {
        color: gridColor
      },
      vertLines: {
        color: gridColor
      }
    },
    layout: {
      attributionLogo: false,
      background: {
        color: background
      },
      textColor,
      panes: {
        separatorColor: paneSeparatorColor,
        separatorHoverColor: paneSeparatorHoverColor
      }
    },
    leftPriceScale: {
      borderColor: dividerColor
    },
    rightPriceScale: {
      borderColor: dividerColor
    },
    timeScale: {
      borderColor: dividerColor
    }
  };
}

/**
 * Get color for pane labels (series names displayed on chart). Uses neutral-medium for readable but not overpowering
 * text.
 */
function getPaneLabelColor() {
  return getCssVar(CSS_VARS.neutralMedium, '#F8F8F2c4');
}

/**
 * Get semantic colors for series (candlesticks, lines, etc.)
 *
 * Returns colors that match the current theme for:
 *
 * - UpColor: Price increase (green/success)
 * - DownColor: Price decrease (red/danger)
 * - LineColor: Default line color (brand/purple)
 */
function getSeriesColors() {
  return {
    downColor: getCssVar(CSS_VARS.danger, '#FF5555'),
    lineColor: getCssVar(CSS_VARS.brand, '#BD93F9'),
    upColor: getCssVar(CSS_VARS.success, '#50FA7B'),
    volumeColor: getCssVar(CSS_VARS.highlightSoft, '#FF79C680')
  };
}

/**
 * Area series adapter: create/backfill/update for numeric area panes.
 */
const areaAdapter = {
  id: 'area',
  seriesType: 'Area',
  applyOptions({
    options,
    seriesApi
  }) {
    if (options) {
      seriesApi.applyOptions(translateOptionsToLwc(options));
    }
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Use theme colors as defaults for area series
    const {
      lineColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: `${lineColor}80`,
      // 50% opacity
      bottomColor: `${lineColor}10`,
      // 6% opacity
      ...translateOptionsToLwc(options) // Allow options to override defaults
    }, paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortNumberPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(numberPointToLwc(point)));
  }
};

/**
 * Bar series adapter: create/backfill/update for OHLC panes rendered as bars.
 */
const barAdapter = {
  id: 'bar',
  seriesType: 'Bar',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    // Reuse OHLC mapping; BarData has the same structural shape (time, open, high, low, close).
    seriesApi.setData(mapOhlcSetToCandles(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    const seriesApi = chart.addSeries(BarSeries, translateOptionsToLwc(options), paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortOhlcPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(ohlcPointToLwc(point)));
  }
};

/**
 * Baseline series adapter: create/backfill/update for numeric panes.
 */
const baselineAdapter = {
  id: 'baseline',
  seriesType: 'Baseline',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    const seriesApi = chart.addSeries(BaselineSeries, translateOptionsToLwc(options), paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortNumberPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(numberPointToLwc(point)));
  }
};

/**
 * Candlestick series adapter: create/backfill/update for OHLC panes.
 */
const candlestickAdapter = {
  id: 'candlestick',
  seriesType: 'Candlestick',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    seriesApi.setData(mapOhlcSetToCandles(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Apply theme colors for candlesticks
    const themeColors = getCandlestickColors();
    const seriesApi = chart.addSeries(CandlestickSeries, {
      ...themeColors,
      ...translateOptionsToLwc(options)
    }, paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    const sortedPoints = sortOhlcPointsAscending({
      points: data
    });
    sortedPoints.forEach(point => seriesApi.update(ohlcPointToLwc(point)));
  }
};

/**
 * Conversion handled by adapter-side helpers in _lwc-converters.ts
 */

/**
 * Histogram series adapter: create/backfill/update for numeric histogram panes (e.g., Volume, MACD hist).
 */
const histogramAdapter = {
  id: 'histogram',
  seriesType: 'Histogram',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    // Convert Set -> Array at the boundary for LWC
    seriesApi.setData(mapNumberSetToLwcArray(data));
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Use theme volume color as default if no color specified
    const {
      volumeColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(HistogramSeries, {
      color: volumeColor,
      ...translateOptionsToLwc(options) // Allow options to override default
    }, paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortNumberPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(numberPointToLwc(point)));
  }
};

/**
 * Line series adapter: create/backfill/update for numeric line panes.
 */
const lineAdapter = {
  id: 'line',
  seriesType: 'Line',
  applyOptions({
    options,
    seriesApi
  }) {
    seriesApi.applyOptions(translateOptionsToLwc(options));
  },
  backfillSeries({
    data,
    seriesApi
  }) {
    const lwcData = mapNumberSetToLwcArray(data);
    seriesApi.setData(lwcData);
  },
  createSeries({
    context: {
      chart,
      paneIndex
    },
    options
  }) {
    // Use theme line color as default if no color specified
    const {
      lineColor
    } = getSeriesColors();
    const seriesApi = chart.addSeries(LineSeries, {
      color: lineColor,
      ...translateOptionsToLwc(options) // Allow options to override default
    }, paneIndex);
    return {
      seriesApi
    };
  },
  updateSeries({
    data,
    seriesApi
  }) {
    sortNumberPointsAscending({
      points: data
    }).forEach(point => seriesApi.update(numberPointToLwc(point)));
  }
};

/**
 * Programmatic series adapter registry and derived types.
 *
 * Design:
 *
 * - Bottom-up authority: adapters define their own internal key (`type`) and external LWC series type (`lwcSeriesType`).
 * - The registry is built from a const tuple of adapters; everything else (unions, helpers) is derived from it.
 * - No `any` usage; `unknown` where appropriate.
 *
 * Adapters must:
 *
 * - Export a constant adapter (e.g., `areaAdapter`) with shape: { type: 'area', lwcSeriesType: 'Area', create({ ctx,
 *   options }), backfill({ api, data }), update({ api, data }) }
 */

const adapters = [areaAdapter, baselineAdapter, barAdapter, candlestickAdapter, histogramAdapter, lineAdapter];

/**
 * SeriesAdapterRegistry encapsulates adapter lookup state and APIs.
 */
class SeriesAdapterRegistry {
  constructor({
    items = adapters,
    valueHandlers = []
  } = {}) {
    this.#map = new Map(items.map(adapter => [adapter.id, adapter]));
    this.#valueHandlers = new Map([numericSeriesValueHandler, ...valueHandlers].map(handler => [handler.id, handler]));
  }

  /** Resolve a value handler by the identifier a descriptor names. */
  getValueHandler({
    id
  }) {
    const handlerId = id ?? numericSeriesValueHandler.id;
    const handler = this.#valueHandlers.get(handlerId);
    if (handler !== undefined) return ok(handler);
    return err(NotFoundError.of({
      errorCode: 'SERIES_VALUE_HANDLER_NOT_FOUND',
      message: 'The series names an unregistered value handler.',
      meta: {
        handlerId
      },
      emitLog: false
    }));
  }

  /**
   * Lookup an adapter by internal series type id. Returns Result.ok(adapter) or
   * Result.err(NoSeriesAdapterForTypeError).
   */
  getAdapterByType(type) {
    const found = this.#map.get(type);
    return found ? ok(found) : err(createNoSeriesAdapterForTypeError({
      seriesType: type
    }));
  }
  #map;
  #valueHandlers;
}

/**
 * Anchored Text Primitives
 *
 * Provides text rendering primitives for LightweightCharts that can be anchored to specific positions within series or
 * panes. These primitives are used for displaying labels on the chart.
 *
 * Two primitive types are provided:
 *
 * - AnchoredSeriesPrimitive: For series-level labels (attached via series.attachPrimitive)
 * - AnchoredPanePrimitive: For pane-level labels (attached via pane.attachPrimitive)
 *
 * Both share the same rendering logic but implement different primitive interfaces.
 */


/**
 * AnchoredTextOptions
 *
 * Configuration options for anchored text rendering.
 */

/**
 * AnchoredTextPaneView
 *
 * View implementation for pane primitives.
 */
class AnchoredTextPaneView {
  constructor(_source) {
    this._source = _source;
  }
  renderer() {
    return new AnchoredTextRenderer(this._source._options);
  }
  update() {
    // No-op: static text doesn't need updates
  }
}

/**
 * AnchoredTextRenderer
 *
 * Shared renderer implementation for both pane and series primitives. Handles the actual canvas drawing logic.
 */
class AnchoredTextRenderer {
  constructor(_options) {
    this._options = _options;
  }
  draw(target) {
    target.useMediaCoordinateSpace(scope => {
      const ctx = scope.context;
      ctx.font = this._options.font;
      const textWidth = ctx.measureText(this._options.text).width;
      const horzMargin = 20;
      let x = horzMargin;
      const width = scope.mediaSize.width;
      const height = scope.mediaSize.height;
      switch (this._options.horzAlign) {
        case 'middle':
          x = width / 2 - textWidth / 2;
          break;
        case 'right':
          x = width - horzMargin - textWidth;
          break;
      }
      const vertMargin = 10;
      const lineHeight = this._options.lineHeight;
      let y = vertMargin + lineHeight;
      switch (this._options.vertAlign) {
        case 'bottom':
          y = height - vertMargin;
          break;
        case 'middle':
          y = height / 2 + lineHeight / 2;
          break;
      }
      ctx.fillStyle = this._options.color;
      ctx.fillText(this._options.text, x, y);
    });
  }
}

/**
 * AnchoredPanePrimitive
 *
 * Pane-level primitive for displaying anchored text. Attached to panes via pane.attachPrimitive().
 */
class AnchoredPanePrimitive {
  _options;
  _paneView;
  _requestUpdate;
  constructor(options) {
    this._options = options;
    this._paneView = new AnchoredTextPaneView(this);
  }

  /**
   * Update the text options and request a redraw
   */
  applyOptions(options) {
    this._options = {
      ...this._options,
      ...options
    };
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }
  attached({
    requestUpdate
  }) {
    this._requestUpdate = requestUpdate;
  }
  detached() {
    this._requestUpdate = undefined;
  }
  paneViews() {
    return [this._paneView];
  }
  updateAllViews() {
    // Trigger view update if needed
  }
}

/**
 * Default options for pane labels (matches legacy styling). Note: color is set dynamically in createPaneLabelPrimitive
 * using theme.
 */
const DEFAULT_PANE_LABEL_OPTIONS = {
  font: 'italic bold 12px Arial',
  horzAlign: 'left',
  lineHeight: 12,
  text: '',
  vertAlign: 'top'
};

/**
 * Create a pane primitive with default styling for labels. Uses theme-aware color from CSS variables.
 */
function createPaneLabelPrimitive(text) {
  return new AnchoredPanePrimitive({
    ...DEFAULT_PANE_LABEL_OPTIONS,
    color: getPaneLabelColor(),
    text
  });
}

/**
 * DiffGroupStates — Pure change detection for chart series groups.
 *
 * Compares previous-cycle snapshots against the current enriched groups from schema.state to produce a GroupDiff per
 * group. The adapter consumes these diffs to decide which LWC DOM operations to execute.
 *
 * Change detection is split into independent dimensions (structural, dataChange, namesChanged) so the adapter can
 * handle combinations correctly — e.g., a name change concurrent with a data append both get reported, and the adapter
 * decides which actions are redundant.
 *
 * First-sight logic: a group present in currentGroups but absent from previousSnapshots → structural: 'added'. No
 * guards requiring "both defined." No silent skips.
 */

/**
 * Capture a GroupSnapshot from a SeriesGroupState for use in the next diff cycle.
 */
function captureGroupSnapshot({
  group
}) {
  return {
    cursor: group.dataState.cursor,
    dataHash: group.dataState.dataHash,
    dataLength: group.dataState.dataLength,
    dataStreamId: group.dataStreamIdentifier.id,
    projectionId: group.dataState.projectionId,
    providerName: group.provider.name,
    streamName: group.presenter.streamName,
    visibleFieldPathsSignature: group.series.values().filter(({
      visible
    }) => visible).map(({
      fieldPath
    }) => fieldPath).toArray().sort().join('|')
  };
}

/**
 * Compare previous group snapshots against current enriched groups to produce per-group change descriptions.
 *
 * - Groups in currentGroups but not in previousSnapshots → structural: 'added'
 * - Groups in previousSnapshots but not in currentGroups → structural: 'removed'
 * - Groups in both → compare snapshot fields across independent dimensions
 */
function diffGroupStates({
  currentGroups,
  previousSnapshots
}) {
  const diffs = new Map();

  // Detect added and changed groups
  for (const [groupId, group] of currentGroups) {
    const previous = previousSnapshots.get(groupId);
    if (!previous) {
      diffs.set(groupId, {
        namesChanged: false,
        structural: 'added'
      });
      continue;
    }
    diffs.set(groupId, diffExistingGroup({
      group,
      previous
    }));
  }

  // Detect removed groups
  for (const groupId of previousSnapshots.keys()) {
    if (!currentGroups.has(groupId)) {
      diffs.set(groupId, {
        namesChanged: false,
        structural: 'removed'
      });
    }
  }
  return diffs;
}

/**
 * Build a flat map of GroupId → SeriesGroupState from the enriched ChartState tree.
 */
function flattenStateToGroupMap({
  panes
}) {
  return panes.values().reduce((map, pane) => {
    for (const group of pane.seriesGroups) {
      map.set(group.groupId, group);
    }
    return map;
  }, new Map());
}

/**
 * Diff a group that exists in both previous and current snapshots.
 *
 * Produces independent dimensions:
 *
 * - DataChange: priority cascade (rebuilt > updated > none)
 * - NamesChanged: independent boolean
 *
 * Data change priority cascade: P0: dataStreamId changed → 'rebuilt' (underlying data source replaced) P1: had cursor,
 * now undefined → 'rebuilt' (provider replaced, cursor regressed) P2: projectionId changed → 'rebuilt' (indicator
 * config rebuilt) P3: dataLength went from 0/undefined to > 0 → 'rebuilt' (indicator data arrived in store, series was
 * created empty and needs full backfill) P4: cursor advanced → 'updated' (new data points or latest bar mutation) P5:
 * dataHash changed → 'updated' (latest bar content changed, same cursor)
 */
/**
 * Priority cascade for data changes. Returns the highest-priority data change kind, or undefined if no data change.
 */
function diffDataChange({
  group,
  previous
}) {
  const {
    dataState,
    dataStreamIdentifier
  } = group;

  // P0: data stream identity changed — underlying source replaced
  if (previous.dataStreamId !== dataStreamIdentifier.id) {
    return 'rebuilt';
  }

  // P1: cursor regression — had cursor, now undefined (provider replaced)
  if (previous.cursor !== undefined && dataState.cursor === undefined) {
    return 'rebuilt';
  }

  // P2: projectionId changed — indicator config rebuilt
  if (previous.projectionId !== undefined && dataState.projectionId !== undefined && previous.projectionId !== dataState.projectionId) {
    return 'rebuilt';
  }

  // P3: indicator data arrived — was empty (0 or undefined), now has data.
  // The series was created with zero data points; needs full backfill.
  if ((previous.dataLength === undefined || previous.dataLength === 0) && dataState.dataLength !== undefined && dataState.dataLength > 0) {
    return 'rebuilt';
  }

  // P4: missing previous cursor but current cursor exists — unsafe for incremental update.
  // Rebuild to avoid replaying historical points via series.update() on an existing series.
  if (previous.cursor === undefined && dataState.cursor !== undefined) {
    return 'rebuilt';
  }

  // P5: cursor advanced — new data points arrived
  if (previous.cursor !== undefined && dataState.cursor !== undefined && dataState.cursor.time > previous.cursor.time) {
    return 'updated';
  }

  // P6: dataHash changed — latest bar content mutated
  if (dataState.dataHash !== undefined && previous.dataHash !== undefined && dataState.dataHash !== previous.dataHash) {
    return 'updated';
  }
  return undefined;
}

/**
 * Diff a group that exists in both previous and current snapshots.
 *
 * Produces independent dimensions:
 *
 * - DataChange: priority cascade (rebuilt > updated > none)
 * - NamesChanged: independent boolean
 *
 * Data change priority cascade: P0: dataStreamId changed → 'rebuilt' (underlying data source replaced) P1: had cursor,
 * now undefined → 'rebuilt' (provider replaced, cursor regressed) P2: projectionId changed → 'rebuilt' (indicator
 * config rebuilt) P3: dataLength went from 0/undefined to > 0 → 'rebuilt' (indicator data arrived in store, series was
 * created empty and needs full backfill) P4: cursor advanced → 'updated' (new data points or latest bar mutation) P5:
 * dataHash changed → 'updated' (latest bar content changed, same cursor)
 */
function diffExistingGroup({
  group,
  previous
}) {
  const visibleFieldPathsSignature = group.series.values().filter(({
    visible
  }) => visible).map(({
    fieldPath
  }) => fieldPath).toArray().sort().join('|');
  if (previous.visibleFieldPathsSignature !== visibleFieldPathsSignature) {
    return {
      dataChange: 'rebuilt',
      namesChanged: false
    };
  }
  const dataChange = diffDataChange({
    group,
    previous
  });
  const namesChanged = previous.providerName !== group.provider.name || previous.streamName !== group.presenter.streamName;
  return {
    ...(dataChange ? {
      dataChange
    } : {}),
    namesChanged
  };
}

/**
 * Minimal logger facade.
 *
 * The copied rendering code reports through a logger-shaped object. Consumers that want structured logging inject
 * their own implementation; the default writes to the console. This is a vendored support copy, recorded as a
 * decoupling item.
 */

const write = (level, args) => {
  console[level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error'](...args);
};
const logger = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
  child: () => logger
};
const pinoLogger = logger;

/**
 * Schedule After Render Utility
 *
 * Provides lifecycle-aware scheduling of work to run after the current render pass completes. Uses
 * `requestAnimationFrame` as the scheduling mechanism and `@ember/destroyable` for cleanup.
 *
 * This replaces the deprecated `schedule('afterRender', ...)` from `@ember/runloop` which:
 *
 * 1. Is not lifecycle-aware — callbacks aren't automatically cancelled when an object is destroyed
 * 2. Can lead to memory leaks and "calling methods on destroyed objects" errors
 * 3. Is flagged by the `ember/no-runloop` ESLint rule
 *
 * Why `requestAnimationFrame`:
 *
 * - Schedules work to run before the next browser paint, which occurs after Ember's render pass
 * - Native browser API — no dependencies needed
 * - Can be cancelled via `cancelAnimationFrame`, enabling proper cleanup
 *
 * Why not `queueMicrotask`:
 *
 * - Microtasks run too early — they execute before the current task completes
 * - Would still be in the tracking/render phase, causing "Cannot set property during render" errors
 */


/**
 * Mixin-style helper that adds lifecycle-aware "schedule after render" capability to a class.
 *
 * Call this in the constructor of your modifier/component to:
 *
 * 1. Set up a `scheduleWork` method for scheduling callbacks
 * 2. Register a destructor that cancels any pending work when the object is destroyed
 *
 * @example
 *
 * ```ts
 * class MyModifier extends Modifier<MySignature> {
 *   readonly #scheduleWork: (callback: () => void) => void;
 *
 *   constructor(owner: unknown, args: Args) {
 *     super(owner, args);
 *     this.#scheduleWork = createScheduleWorkHelper(this);
 *   }
 *
 *   modify() {
 *     this.#scheduleWork(() => {
 *       // This runs after render, and is cancelled if modifier is destroyed
 *     });
 *   }
 * }
 * ```;
 * ```
 */
function createScheduleWorkHelper(destroyable) {
  const pendingCleanups = new Set();

  // Register destructor to cancel any pending scheduled work when object is destroyed
  registerDestructor(destroyable, () => {
    for (const cleanup of pendingCleanups) {
      cleanup();
    }
    pendingCleanups.clear();
  });
  return callback => {
    const cleanup = scheduleAfterRender(() => {
      pendingCleanups.delete(cleanup);
      callback();
    });
    pendingCleanups.add(cleanup);
  };
}

/**
 * Schedules a callback to run after the current render pass completes.
 *
 * @returns A cleanup function that cancels the scheduled work if not yet executed.
 */
function scheduleAfterRender(callback) {
  // SSR/Fastboot guard - requestAnimationFrame doesn't exist in Node.js
  if (typeof requestAnimationFrame === 'undefined') {
    // In SSR, run synchronously (or could skip entirely depending on use case)
    callback();
    return () => {};
  }
  const frameId = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(frameId);
}

/**
 * ChartLwcAdapter Modifier
 *
 * Layer 3 of the reactive chart architecture. Owns all LWC DOM operations for the reactive chart schema. Reads
 * `schema.state` (enriched tree) reactively and reconciles LWC DOM state against it.
 *
 * Change detection is delegated to the pure `diffGroupStates` function which compares a Map<GroupId, GroupSnapshot>
 * (captured after each reconciliation) against the current enriched groups. The adapter only stores LWC DOM handles
 * (#paneStates) and previous snapshots (#previousSnapshots) — no parallel cached state.
 *
 * Reconciliation strategy (two-phase):
 *
 * Phase 1 — Structural:
 *
 * - Groups marked 'added' → find correct pane, create pane if needed, build series with full backfill
 * - Groups marked 'removed' → tear down series, remove from pane, remove pane if empty
 *
 * Phase 2 — Data (for existing groups):
 *
 * - DataChange: 'rebuilt' → tear down + recreate series with full backfill
 * - DataChange: 'updated' → fetch since previous cursor, updateSeries (LWC upsert-by-timestamp)
 * - NamesChanged (when no structural/rebuilt) → update labels via applyOptions
 *
 * Usage:
 *
 * ```hbs
 * <div {{chartLwcAdapter this.reactiveSchema this.seriesAdapterRegistry this.domainContext}}></div>
 * ```
 */

class ChartLwcAdapterModifier extends Modifier {
  /**
   * Re-reads the current chart theme and applies it to the LWC chart instance. Called by CanvasThemeModifier when the
   * document theme class changes.
   */
  applyTheme = () => {
    if (!this.#chart) return;
    this.#chart.applyOptions(getChartTheme());
  };
  modify(element, [state, seriesAdapterRegistry, domainContext], {
    onReady,
    onError
  }) {
    this.#onError = onError;
    // Schedule LWC DOM mutations after render
    this.#scheduleWork(() => {
      // Create chart on first call
      if (!this.#chart) {
        this.#chart = createChart(element, {
          ...getChartTheme(),
          addDefaultPane: false,
          autoSize: true,
          leftPriceScale: {
            visible: false
          },
          timeScale: {
            secondsVisible: false,
            tickMarkFormatter: this.#tickMarkFormatter,
            timeVisible: true
          }
        });
        onReady?.({
          applyTheme: this.applyTheme,
          chart: this.#chart
        });
      }
      this.#reconcile({
        chart: this.#chart,
        domainContext,
        seriesAdapterRegistry,
        state
      });

      // Apply focus range once after first data load
      if (!this.#hasAppliedInitialFocusRange && this.#paneStates.size > 0) {
        this.#applyInitialFocusRange({
          chart: this.#chart,
          domainContext
        });
        this.#hasAppliedInitialFocusRange = true;
      }
    });
  }

  /**
   * The LWC chart instance, created on first modify() call.
   */
  #chart;
  #onError;

  /**
   * Whether the initial focus range has been applied after the first data load.
   */
  #hasAppliedInitialFocusRange = false;

  /**
   * Adapter state: maps pane index to live LWC pane state.
   */
  #paneStates = new Map();

  /**
   * Previous-cycle domain context for detecting global label changes (timeframe, trading pair name). When these change,
   * all pane labels need refreshing regardless of per-group diff results.
   */
  #previousDomainContext;

  /**
   * Previous-cycle snapshots for change detection. Captured after each reconciliation pass and fed to diffGroupStates
   * on the next cycle.
   */
  #previousSnapshots = new Map();

  /**
   * Groups whose value interpretation failed. They keep no partial series and are retried on the next reconciliation
   * cycle, so a transient handler failure cannot leave a plausible but incomplete chart.
   */
  #needsBackfill = new Set();

  /**
   * Lifecycle-aware scheduler that cancels pending work on destruction.
   */
  #scheduleWork = createScheduleWorkHelper(this);

  /**
   * Add a new group: find or create the correct pane from the enriched state, then build series with full backfill.
   */
  #addGroup({
    chart,
    domainContext,
    enrichedGroup,
    groupId,
    seriesAdapterRegistry,
    state
  }) {
    // Find which pane index this group belongs to in the enriched state
    const targetPaneInfo = this.#findPaneForGroup({
      groupId,
      state
    });
    if (!targetPaneInfo) return;
    const {
      isFirstGroupInPane,
      paneIndex,
      paneState: enrichedPane
    } = targetPaneInfo;

    // Get or create the pane
    let chartPane = this.#paneStates.get(paneIndex);
    if (!chartPane) {
      // Orphan pane reuse: after teardown, LWC keeps 1 orphan pane. Reuse it for the first pane.
      const chartPanes = chart.panes();
      const isFirstPaneAndOrphanExists = this.#paneStates.size === 0 && chartPanes.length > 0;
      const paneApi = isFirstPaneAndOrphanExists ? chartPanes[0] : chart.addPane(true);
      const actualPaneIndex = paneApi.paneIndex();

      // Build pane label
      const labelPrimitive = this.#buildPaneLabel({
        domainContext,
        isFirstPane: actualPaneIndex === 0,
        paneState: enrichedPane
      });
      if (labelPrimitive) {
        paneApi.attachPrimitive(labelPrimitive);
      }
      chartPane = {
        labelPrimitive,
        paneApi,
        seriesGroups: new Map()
      };
      this.#paneStates.set(actualPaneIndex, chartPane);
    }

    // Build the series group
    const groupResult = this.#buildSeriesGroup({
      chart,
      enrichedGroup,
      paneIndex: chartPane.paneApi.paneIndex(),
      seriesAdapterRegistry
    });

    // Always register the group — empty placeholder when data is not yet available, so the group
    // remains addressable for rebuild on subsequent cycles.
    chartPane.seriesGroups.set(groupId, groupResult ?? {
      series: new Map()
    });

    // Update pane label if this is the first group
    if (isFirstGroupInPane && chartPane.labelPrimitive) {
      this.#refreshPaneLabel({
        chartPane,
        domainContext,
        enrichedPane,
        paneIndex: chartPane.paneApi.paneIndex()
      });
    }
  }

  /**
   * Focus the chart time scale on the latest ~400 data points after first data load.
   */
  #applyInitialFocusRange({
    chart,
    domainContext
  }) {
    const count = domainContext.marketDataDataSampleCount;
    if (count === 0) return;
    const maxRange = Math.max(0, count - 1);
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, maxRange - 400),
      to: maxRange
    });
  }

  /**
   * Build the pane label primitive from the first series group's resolved presenter and provider.
   */
  #buildPaneLabel({
    domainContext,
    isFirstPane,
    paneState
  }) {
    const firstGroup = paneState.seriesGroups[0];
    if (!firstGroup) return undefined;

    // Find first visible series field path
    const firstVisibleSeries = firstGroup.series.find(s => s.visible);
    if (!firstVisibleSeries) return undefined;
    const {
      presenter,
      provider
    } = firstGroup;

    // Find descriptor for first visible field
    const descriptorWithParent = findDescriptorWithParent({
      descriptors: presenter.structuralDescriptors,
      fieldPath: firstVisibleSeries.fieldPath
    });
    if (!descriptorWithParent) {
      // Fallback: minimal label
      const fallbackLabel = isFirstPane ? `${domainContext.tradableAssetPairName} | ${provider.name} - ${firstGroup.streamType} [${domainContext.timeframeLabel}]` : `${provider.name} - ${firstGroup.streamType} [${domainContext.timeframeLabel}]`;
      return createPaneLabelPrimitive(fallbackLabel);
    }
    const labelText = buildPaneLabel({
      fieldDescriptor: descriptorWithParent.descriptor,
      isFirstPane,
      parentDescriptor: descriptorWithParent.parent,
      providerName: provider.name,
      streamType: presenter.streamName,
      timeframeLabel: domainContext.timeframeLabel,
      tradableAssetPairName: domainContext.tradableAssetPairName
    });
    return createPaneLabelPrimitive(labelText);
  }

  /**
   * Build a single series group from the enriched tree: fetch data, create series for each visible field.
   *
   * Returns the adapter group state (LWC DOM handles only), or undefined if no series could be created.
   */
  #buildSeriesGroup({
    chart,
    enrichedGroup,
    paneIndex,
    seriesAdapterRegistry
  }) {
    const {
      dataStreamIdentifier,
      groupId,
      presenter,
      provider
    } = enrichedGroup;

    // Fetch data (full backfill — no cursor)
    const dataSamples = this.#fetchSamples({
      dataStreamIdentifier,
      provider
    }).match({
      Err: error => {
        pinoLogger.error({
          error
        }, '[ChartLwcAdapter] failed to fetch samples for a new group');
        this.#needsBackfill.add(groupId);
        return undefined;
      },
      Ok: samples => samples
    });
    if (dataSamples === undefined) {
      return undefined;
    }

    // Create series for each visible field
    const seriesMap = new Map();
    let failed = false;
    for (const seriesLayout of enrichedGroup.series) {
      if (!seriesLayout.visible) continue;
      const seriesState = this.#createSeries({
        chart,
        dataSamples,
        fieldPath: seriesLayout.fieldPath,
        groupId,
        paneIndex,
        presenter,
        priceScaleId: enrichedGroup.priceScale?.id,
        seriesAdapterRegistry
      });
      if (seriesState) {
        seriesMap.set(seriesLayout.fieldPath, seriesState);
      } else {
        failed = true;
      }
    }
    if (failed || seriesMap.size === 0) {
      for (const seriesState of seriesMap.values()) {
        this.#removeSeries({
          chart,
          seriesApi: seriesState.seriesApi
        });
      }
      this.#needsBackfill.add(groupId);
      return undefined;
    }
    this.#needsBackfill.delete(groupId);

    // Apply scaleMargins to the price scale via any series in this group (all share the same priceScaleId)
    if (enrichedGroup.priceScale?.scaleMargins) {
      const firstSeries = seriesMap.values().next().value;
      if (firstSeries) {
        firstSeries.seriesApi.priceScale().applyOptions({
          scaleMargins: enrichedGroup.priceScale.scaleMargins
        });
      }
    }
    return {
      series: seriesMap
    };
  }

  /**
   * Create a single series on the chart: resolve descriptor, get adapter, create series, backfill.
   */
  #createSeries({
    chart,
    dataSamples,
    fieldPath,
    groupId,
    paneIndex,
    presenter,
    priceScaleId,
    seriesAdapterRegistry
  }) {
    // Find descriptor for this field
    const descriptorWithParent = findDescriptorWithParent({
      descriptors: presenter.structuralDescriptors,
      fieldPath
    });
    if (!descriptorWithParent) {
      pinoLogger.warn({
        fieldPath
      }, '[ChartLwcAdapter] descriptor not found for field');
      return undefined;
    }
    const {
      descriptor,
      parent: parentDescriptor
    } = descriptorWithParent;
    if (!isCompleteLeafStructuralDescriptor(descriptor)) {
      pinoLogger.warn({
        fieldPath
      }, '[ChartLwcAdapter] descriptor is not a complete leaf');
      return undefined;
    }

    // Get adapter for this series kind
    const adapterResult = seriesAdapterRegistry.getAdapterByType(descriptor.seriesKind);
    return adapterResult.match({
      Err: error => {
        pinoLogger.error({
          error,
          seriesKind: descriptor.seriesKind
        }, '[ChartLwcAdapter] no adapter for series kind');
        return undefined;
      },
      Ok: adapter => {
        const seriesTitle = buildSeriesTitle({
          fieldDescriptor: descriptor,
          parentDescriptor
        });
        const seriesKey = `${groupId}::${fieldPath}`;
        return seriesAdapterRegistry.getValueHandler({
          id: descriptor.valueHandler
        }).match({
          Err: error => {
            this.#reportValueFailure({
              error,
              fieldPath,
              groupId
            });
            return undefined;
          },
          Ok: valueHandler => {
            const interpreted = dataSamples.size === 0 ? ok(new Set()) : this.#interpretSeriesData({
              points: presenter.projectField({
                dataSamples,
                fieldPath
              }),
              handler: valueHandler,
              seriesKind: descriptor.seriesKind
            });
            return interpreted.match({
              Err: error => {
                this.#reportValueFailure({
                  error,
                  fieldPath,
                  groupId
                });
                return undefined;
              },
              Ok: data => {
                const seriesOptions = {
                  name: seriesTitle
                };
                if (priceScaleId !== undefined) seriesOptions.priceScaleId = priceScaleId;
                if (valueHandler.priceFormat !== undefined) seriesOptions.priceFormat = valueHandler.priceFormat;
                const {
                  seriesApi
                } = adapter.createSeries({
                  context: {
                    chart,
                    paneIndex,
                    seriesKey
                  },
                  options: seriesOptions
                });
                if (data.size > 0) {
                  adapter.backfillSeries({
                    data,
                    seriesApi
                  });
                }
                return {
                  adapter,
                  seriesApi
                };
              }
            });
          }
        });
      }
    });
  }

  /**
   * Fetch data samples from a provider for a given stream.
   *
   * When cursor is provided, fetches data since that cursor (incremental). When cursor is undefined, fetches all data
   * (full backfill).
   */
  #fetchSamples({
    cursor,
    dataStreamIdentifier,
    provider
  }) {
    const dataResult = provider.getDataSince({
      cursor,
      dataStreamIdentifier
    });
    return dataResult.match({
      Err: error => {
        if (error.errorCode === 'DATA_PROVIDER_NO_NEW_DATA') {
          return ok(new Set());
        }
        return err(error);
      },
      Ok: batch => {
        const samples = batch.updates.values().reduce((accumulated, update) => accumulated.add(update.data), new Set());
        return ok(samples);
      }
    });
  }

  /**
   * Find the AdapterGroupState for a group by searching all panes.
   */
  #findAdapterGroupState({
    groupId
  }) {
    for (const [, paneState] of this.#paneStates) {
      const group = paneState.seriesGroups.get(groupId);
      if (group) return group;
    }
    return undefined;
  }

  /**
   * Find the pane index and enriched pane for a given group ID from the enriched state tree.
   */
  #findPaneForGroup({
    groupId,
    state
  }) {
    for (let paneIdx = 0; paneIdx < state.panes.length; paneIdx++) {
      const pane = state.panes[paneIdx];
      if (!pane) continue;
      for (let groupIdx = 0; groupIdx < pane.seriesGroups.length; groupIdx++) {
        const group = pane.seriesGroups[groupIdx];
        if (!group) continue;
        const candidateGroupId = group.groupId;
        if (candidateGroupId === groupId) {
          return {
            isFirstGroupInPane: groupIdx === 0,
            paneIndex: paneIdx,
            paneState: pane
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Tear down a group's series and recreate with full backfill. Used when dataChange is 'rebuilt' (identity changed:
   * dataStreamId, cursor regression, projectionId).
   *
   * Finds the pane containing this group and replaces its series in-place.
   */
  #rebuildGroupData({
    chart,
    enrichedGroup,
    groupId,
    seriesAdapterRegistry
  }) {
    // Find the pane containing this group
    for (const [paneIndex, paneState] of this.#paneStates) {
      const existingGroup = paneState.seriesGroups.get(groupId);
      if (!existingGroup) continue;

      // Build the replacement first, then remove the old series only on success. A failed interpretation must not
      // discard previously rendered history.
      const newGroupState = this.#buildSeriesGroup({
        chart,
        enrichedGroup,
        paneIndex,
        seriesAdapterRegistry
      });
      if (newGroupState === undefined) {
        break;
      }
      for (const [, seriesState] of existingGroup.series) {
        this.#removeSeries({
          chart,
          seriesApi: seriesState.seriesApi
        });
      }
      paneState.seriesGroups.set(groupId, newGroupState);
      break;
    }
  }

  /**
   * Two-phase reconciliation driven by diffGroupStates.
   *
   * Phase 1 — Structural: process added/removed groups (create/tear down panes and series). Phase 2 — Data: process
   * data changes and name changes for existing groups.
   *
   * After both phases, capture fresh snapshots for the next cycle.
   */
  #reconcile({
    chart,
    domainContext,
    seriesAdapterRegistry,
    state
  }) {
    const currentGroups = flattenStateToGroupMap({
      panes: state.panes
    });
    const diffs = diffGroupStates({
      currentGroups,
      previousSnapshots: this.#previousSnapshots
    });

    // Retry groups whose previous value interpretation failed. Groups that are structurally added below are skipped;
    // this loop handles a failed earlier add or rebuild without duplicating Phase 1.
    const retriedGroups = new Set();
    for (const groupId of this.#needsBackfill.values().toArray()) {
      if (diffs.get(groupId)?.structural === 'added') continue;
      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) {
        this.#needsBackfill.delete(groupId);
        continue;
      }
      const hasPane = this.#paneStates.values().some(paneState => paneState.seriesGroups.has(groupId));
      if (hasPane) {
        this.#rebuildGroupData({
          chart,
          enrichedGroup,
          groupId,
          seriesAdapterRegistry
        });
      } else {
        this.#addGroup({
          chart,
          domainContext,
          enrichedGroup,
          groupId,
          seriesAdapterRegistry,
          state
        });
      }
      retriedGroups.add(groupId);
    }

    // Phase 1 — Structural: removals first (avoids index confusion), then additions
    for (const [groupId, diff] of diffs) {
      if (diff.structural !== 'removed') continue;
      this.#tearDownGroup({
        chart,
        groupId
      });
    }
    for (const [groupId, diff] of diffs) {
      if (diff.structural !== 'added') continue;
      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) continue;
      this.#addGroup({
        chart,
        domainContext,
        enrichedGroup,
        groupId,
        seriesAdapterRegistry,
        state
      });
    }

    // Detect global domain context changes (timeframe label, trading pair name).
    // These affect all pane labels but are not per-group concerns, so they're tracked here
    // rather than in diffGroupStates.
    const domainContextChanged = this.#previousDomainContext !== undefined && (this.#previousDomainContext.timeframeLabel !== domainContext.timeframeLabel || this.#previousDomainContext.tradableAssetPairName !== domainContext.tradableAssetPairName);

    // Phase 2 — Data: process changes for groups that exist in both previous and current
    for (const [groupId, diff] of diffs) {
      if (diff.structural) continue; // Already handled in Phase 1
      if (retriedGroups.has(groupId)) continue;
      const enrichedGroup = currentGroups.get(groupId);
      if (!enrichedGroup) continue;
      switch (diff.dataChange) {
        case 'rebuilt':
          {
            this.#rebuildGroupData({
              chart,
              enrichedGroup,
              groupId,
              seriesAdapterRegistry
            });
            break;
          }
        case 'updated':
          {
            const previousSnapshot = this.#previousSnapshots.get(groupId);
            this.#updateGroupData({
              enrichedGroup,
              groupId,
              previousCursor: previousSnapshot?.cursor,
              seriesAdapterRegistry
            });
            break;
          }
      }
      if (diff.namesChanged || domainContextChanged) {
        this.#updateGroupNames({
          domainContext,
          enrichedGroup,
          groupId,
          state
        });
      }
    }

    // Capture snapshots for next cycle
    this.#previousSnapshots.clear();
    for (const [groupId, group] of currentGroups) {
      this.#previousSnapshots.set(groupId, captureGroupSnapshot({
        group
      }));
    }
    this.#previousDomainContext = domainContext;
  }

  /**
   * Refresh a pane's label text from the first group's enriched state.
   */
  #refreshPaneLabel({
    chartPane,
    domainContext,
    enrichedPane,
    paneIndex
  }) {
    if (!chartPane.labelPrimitive) return;
    const firstGroup = enrichedPane.seriesGroups[0];
    if (!firstGroup) return;
    const firstVisibleSeries = firstGroup.series.find(s => s.visible);
    if (!firstVisibleSeries) return;
    const descriptorWithParent = findDescriptorWithParent({
      descriptors: firstGroup.presenter.structuralDescriptors,
      fieldPath: firstVisibleSeries.fieldPath
    });
    if (descriptorWithParent) {
      const newLabelText = buildPaneLabel({
        fieldDescriptor: descriptorWithParent.descriptor,
        isFirstPane: paneIndex === 0,
        parentDescriptor: descriptorWithParent.parent,
        providerName: firstGroup.provider.name,
        streamType: firstGroup.presenter.streamName,
        timeframeLabel: domainContext.timeframeLabel,
        tradableAssetPairName: domainContext.tradableAssetPairName
      });
      chartPane.labelPrimitive.applyOptions({
        text: newLabelText
      });
    }
  }

  /**
   * Remove a series from the chart. Clears the crosshair position first to work around an LWC bug
   * (https://github.com/tradingview/lightweight-charts/issues/2044) where series data mutations trigger a synchronous
   * crosshair hit-test against bar indices that no longer have data.
   */
  #removeSeries({
    chart,
    seriesApi
  }) {
    chart.clearCrosshairPosition();
    chart.removeSeries(seriesApi);
  }

  /**
   * Tear down all series for a removed group. If the pane becomes empty, remove the pane.
   */
  #tearDownGroup({
    chart,
    groupId
  }) {
    for (const [paneIndex, paneState] of this.#paneStates) {
      const existingGroup = paneState.seriesGroups.get(groupId);
      if (!existingGroup) continue;

      // Remove all series from this group
      for (const [, seriesState] of existingGroup.series) {
        this.#removeSeries({
          chart,
          seriesApi: seriesState.seriesApi
        });
      }
      paneState.seriesGroups.delete(groupId);

      // If pane is now empty, tear it down
      if (paneState.seriesGroups.size === 0) {
        if (paneState.labelPrimitive) {
          paneState.paneApi.detachPrimitive(paneState.labelPrimitive);
        }
        // LWC silently ignores removing the last pane
        chart.removePane(paneState.paneApi.paneIndex());
        this.#paneStates.delete(paneIndex);
      }
      break;
    }
  }

  /**
   * Format tick marks on the time scale based on the tick mark type.
   */
  #tickMarkFormatter = (time, tickMarkType) => {
    const date = new Date(time * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    if (tickMarkType === TickMarkType.Year) return `${month}/${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.Month) return `${month}/${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.DayOfMonth) return `${day} ${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.Time) return `${hours}:${minutes}`;
    if (tickMarkType === TickMarkType.TimeWithSeconds) return `${hours}:${minutes}`;
    return `${hours}:${minutes}`;
  };

  /**
   * Incremental data update for a group: fetch data since previous cursor and call updateSeries per visible series.
   *
   * Uses `getDataSince({ cursor: previousCursor })` which returns data at or after the cursor timestamp. LWC's
   * `seriesApi.update()` is upsert-by-timestamp, so both new appends and latest-bar overwrites are handled correctly.
   */
  #updateGroupData({
    enrichedGroup,
    groupId,
    previousCursor,
    seriesAdapterRegistry
  }) {
    const {
      dataStreamIdentifier,
      presenter,
      provider
    } = enrichedGroup;

    // Fetch data since previous cursor
    const dataSamples = this.#fetchSamples({
      cursor: previousCursor,
      dataStreamIdentifier,
      provider
    }).match({
      Err: error => {
        pinoLogger.error({
          error
        }, '[ChartLwcAdapter] failed to fetch samples for an update');
        this.#needsBackfill.add(groupId);
        return undefined;
      },
      Ok: samples => samples
    });
    if (dataSamples === undefined || dataSamples.size === 0) return;

    // Find the adapter group state for this group
    const adapterGroupState = this.#findAdapterGroupState({
      groupId
    });
    if (!adapterGroupState) return;

    // Update each visible series
    for (const seriesState of enrichedGroup.series) {
      if (!seriesState.visible) continue;
      const cachedSeries = adapterGroupState.series.get(seriesState.fieldPath);
      if (!cachedSeries) continue;
      const found = findDescriptorWithParent({
        descriptors: presenter.structuralDescriptors,
        fieldPath: seriesState.fieldPath
      });
      if (found === undefined || !isCompleteLeafStructuralDescriptor(found.descriptor)) continue;
      const fieldDescriptor = found.descriptor;
      const handlerResult = seriesAdapterRegistry.getValueHandler({
        id: fieldDescriptor.valueHandler
      });
      handlerResult.match({
        Err: error => {
          this.#reportValueFailure({
            error,
            fieldPath: seriesState.fieldPath,
            groupId
          });
          this.#needsBackfill.add(groupId);
        },
        Ok: handler => this.#interpretSeriesData({
          points: presenter.projectField({
            dataSamples,
            fieldPath: seriesState.fieldPath
          }),
          handler,
          seriesKind: fieldDescriptor.seriesKind
        }).match({
          Err: error => {
            this.#reportValueFailure({
              error,
              fieldPath: seriesState.fieldPath,
              groupId
            });
            this.#needsBackfill.add(groupId);
          },
          Ok: projectedData => {
            const incrementalProjectedData = previousCursor === undefined ? projectedData : new Set(projectedData.values().filter(point => point.time.getTime() >= previousCursor.time));
            if (incrementalProjectedData.size > 0) {
              cachedSeries.adapter.updateSeries({
                data: incrementalProjectedData,
                seriesApi: cachedSeries.seriesApi
              });
            }
          }
        })
      });
    }
  }
  #interpretSeriesData({
    points,
    handler,
    seriesKind
  }) {
    return interpretProjectedPoints({
      points,
      handler,
      seriesKind
    });
  }
  #reportValueFailure({
    error,
    fieldPath,
    groupId
  }) {
    pinoLogger.error({
      error,
      fieldPath,
      groupId
    }, '[ChartLwcAdapter] series value interpretation failed');
    this.#onError?.({
      error,
      fieldPath,
      groupId
    });
  }

  /**
   * Update pane label and series titles when a group's stream name or provider name changes. Operates in-place via
   * `applyOptions` — no teardown or structural rebuild.
   */
  #updateGroupNames({
    domainContext,
    enrichedGroup,
    groupId,
    state
  }) {
    const adapterGroupState = this.#findAdapterGroupState({
      groupId
    });
    if (!adapterGroupState) return;

    // Update series titles for each visible series in this group
    for (const seriesState of enrichedGroup.series) {
      if (!seriesState.visible) continue;
      const cachedSeries = adapterGroupState.series.get(seriesState.fieldPath);
      if (!cachedSeries) continue;
      const descriptorWithParent = findDescriptorWithParent({
        descriptors: enrichedGroup.presenter.structuralDescriptors,
        fieldPath: seriesState.fieldPath
      });
      if (!descriptorWithParent) continue;
      const newSeriesTitle = buildSeriesTitle({
        fieldDescriptor: descriptorWithParent.descriptor,
        parentDescriptor: descriptorWithParent.parent
      });
      cachedSeries.adapter.applyOptions({
        options: {
          name: newSeriesTitle
        },
        seriesApi: cachedSeries.seriesApi
      });
    }

    // Update pane label if this is the first group in its pane
    const paneInfo = this.#findPaneForGroup({
      groupId,
      state
    });
    if (!paneInfo || !paneInfo.isFirstGroupInPane) return;
    const chartPane = this.#paneStates.get(paneInfo.paneIndex);
    if (!chartPane) {
      // Pane indices may differ between enriched state and adapter — search by group membership
      for (const [, pane] of this.#paneStates) {
        if (!pane.seriesGroups.has(groupId)) continue;
        if (pane.labelPrimitive) {
          this.#refreshPaneLabel({
            chartPane: pane,
            domainContext,
            enrichedPane: paneInfo.paneState,
            paneIndex: pane.paneApi.paneIndex()
          });
        }
        break;
      }
      return;
    }
    if (chartPane.labelPrimitive) {
      this.#refreshPaneLabel({
        chartPane,
        domainContext,
        enrichedPane: paneInfo.paneState,
        paneIndex: paneInfo.paneIndex
      });
    }
  }
}

const lightweightSchemaChartsEmberPackage = '@lightweight-schema-charts/ember';

export { AbstractDataProvider, AbstractDataStreamPresenter, ChartLayout, ChartLwcAdapterModifier, ReactiveChartSchema, SeriesAdapterRegistry, adapters, createReactiveChartSchema, interpretProjectedPoints, lightweightSchemaChartsEmberPackage, numericSeriesValueHandler, validateDataProviderIdentifier, validateSeriesNumber, validateSeriesOhlc };
//# sourceMappingURL=index.js.map
