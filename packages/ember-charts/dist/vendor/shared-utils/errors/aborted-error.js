import { createAppError } from './app-error.js';

/**
 * AbortedError instance type - use this in type positions.
 *
 * @example Type FetchAbortedError = AbortedError<{ errorCode: 'HTTP_FETCH_ABORTED'; message: string; meta?: { url:
 * string; reason: 'user' | 'signal' | 'timeout' }; }>;
 */

/**
 * Generic error for intentionally cancelled/aborted operations.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use when an operation was explicitly cancelled by user action, AbortSignal, or system decision. This is distinct from
 * timeouts (TimeoutError) or failures (other errors) - the operation was intentionally stopped before completion.
 *
 * Common use cases:
 *
 * - Fetch requests cancelled via AbortController/AbortSignal
 * - User-initiated cancellation of long-running operations
 * - System-initiated abort due to state changes (e.g., component unmount)
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type FetchAbortedError = AbortedError<{ errorCode:
 * 'HTTP_FETCH_ABORTED'; message: string; meta: { url: string; reason: 'user' | 'signal' | 'timeout' }; // Required -
 * TypeScript enforces at call site }>;
 *
 * // Use in function return type function fetchData(url: string, signal: AbortSignal): Result<Data, FetchAbortedError>
 * { if (signal.aborted) { return Result.err( AbortedError.of({ errorCode: 'HTTP_FETCH_ABORTED', message: 'Fetch request
 * aborted by signal', meta: { url, reason: 'signal' }, // ✅ Required - TypeScript error if omitted }), ); } return
 * Result.ok(data); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type FetchAbortedError = AbortedError<{ errorCode:
 * 'HTTP_FETCH_ABORTED'; message: string; meta?: { url: string }; }>; type ComponentUnmountAbortedError = AbortedError<{
 * errorCode: 'COMPONENT_UNMOUNT_ABORTED'; message: string; meta?: { componentName: string; operationName: string };
 * }>;
 *
 * // Discriminate on errorCode result.match({ err: (error) => { switch (error.errorCode) { case 'HTTP_FETCH_ABORTED':
 * console.log('Fetch was cancelled'); break; case 'COMPONENT_UNMOUNT_ABORTED': console.log('Component unmounted during
 * operation'); break; } }, });
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type UserCancelledError = AbortedError<{ errorCode:
 * 'USER_CANCELLED_OPERATION'; message: string; meta?: { operationName?: string }; // Explicitly optional }>;
 *
 * AbortedError.of({ errorCode: 'USER_CANCELLED_OPERATION', message: 'User cancelled the operation', // meta is optional
 *
 * - Can omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) AbortedError.of({ errorCode: 'ABORTED'
 * }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function fetchA(): Result<A,
 * AbortedError<{ errorCode: string; message: string }>> {} // BAD - not specific! function fetchB(): Result<B,
 * AbortedError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
const AbortedError = createAppError({
  defaultEmitLog: false,
  // Aborts are often expected/intentional, not errors
  defaultSeverity: 'info',
  // Informational - operation was stopped as intended
  type: 'AbortedError'
});

export { AbortedError };
//# sourceMappingURL=aborted-error.js.map
