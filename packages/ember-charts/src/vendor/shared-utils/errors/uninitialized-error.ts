import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from './app-error';

/**
 * UninitializedError instance type - use this in type positions.
 *
 * @example Type SubscriptionManagerUninitializedError = UninitializedError<{ errorCode:
 * 'SUBSCRIPTION_MANAGER_UNINITIALIZED'; message: string; meta?: { component: 'SubscriptionManager'; operation?: string
 * }; }>;
 */
export type UninitializedError<TOpts extends GenericErrorArgs> =
  GenericErrorInstance<{
    errorCode: TOpts['errorCode'];
    errorGroup: TOpts['errorGroup'];
    message: TOpts['message'];
    meta: TOpts['meta'];
    type: 'UninitializedError';
  }>;

/**
 * Generic error for when a component, resource, or manager has not been initialized (e.g. start() not called yet).
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * This error is commonly used as a sentinel/state error (e.g. the initial rejected Task for a manager that must be
 * started). Because it is often created preemptively, it MUST NOT emit logs by default.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type SubscriptionManagerUninitializedError =
 * UninitializedError<{ errorCode: 'SUBSCRIPTION_MANAGER_UNINITIALIZED'; message: string; meta?: { component:
 * 'SubscriptionManager' }; }>;
 *
 * // Use in function return type function getResource(): Task<Resource, SubscriptionManagerUninitializedError> { return
 * Task.reject( UninitializedError.of({ errorCode: 'SUBSCRIPTION_MANAGER_UNINITIALIZED', message: 'SubscriptionManager
 * has not been started', meta: { component: 'SubscriptionManager' }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type ConnectionManagerUninitializedError =
 * UninitializedError<{ errorCode: 'CONNECTION_MANAGER_UNINITIALIZED'; message: string; meta?: { operation?: string };
 * }>;
 *
 * Type CacheUninitializedError = UninitializedError<{ errorCode: 'CACHE_UNINITIALIZED'; message: string; meta?: {
 * cacheName?: string }; }>;
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) UninitializedError.of({ errorCode:
 * 'UNINITIALIZED' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * UninitializedError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B,
 * UninitializedError<{ errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode
 * types!
 */
export const UninitializedError = createAppError({
  defaultEmitLog: false, // Often created as a sentinel/state error; do not log on creation by default
  defaultSeverity: 'debug', // Indicates expected lifecycle state, not an operational failure
  type: 'UninitializedError',
});
