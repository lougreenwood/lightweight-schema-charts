import { createAppError } from './app-error.js';

/**
 * ConflictError instance type - use this in type positions.
 *
 * @example Type DuplicateUserError = ConflictError<{ errorCode: 'DUPLICATE_USER'; message: string; meta: { resource:
 * 'User' }; // Required by default }>;
 */

/**
 * Generic error for when the requested operation conflicts with existing state.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` to make it
 * discriminable.
 *
 * Use this for duplicate registration attempts, unique constraint violations, or any operation that cannot proceed due
 * to conflicting existing data.
 *
 * @example // ✅ CORRECT: Define specific error type with required meta (no ?) type DuplicateTradePositionSetError =
 * ConflictError<{ errorCode: 'DUPLICATE_TRADE_POSITION_SET'; message: string; meta: { resource: 'TradePositionSet' };
 * // Required - TypeScript enforces at call site }>;
 *
 * // Use in function return type function registerTradePositionSet(...): Result<void, DuplicateTradePositionSetError> {
 * return Result.err( ConflictError.of({ errorCode: 'DUPLICATE_TRADE_POSITION_SET', message: 'A position set for this
 * trading pair already exists', meta: { resource: 'TradePositionSet' }, // ✅ Required - TypeScript error if omitted }),
 * ); }
 *
 * @example // ✅ CORRECT: Multiple variants from same blueprint type DuplicateUserError = ConflictError<{ errorCode:
 * 'DUPLICATE_USER'; message: string; }>; type DuplicateOrderError = ConflictError<{ errorCode: 'DUPLICATE_ORDER';
 * message: string; }>;
 *
 * // TypeScript can discriminate these as DIFFERENT types type ConflictErrors = DuplicateUserError |
 * DuplicateOrderError;
 *
 * // Handle with discrimination result.match({ err: (error) => { switch (error.errorCode) { case 'DUPLICATE_USER':
 * console.log('User already exists'); break; case 'DUPLICATE_ORDER': console.log('Order already exists'); break; } },
 * });
 *
 * @example // ✅ CORRECT: Explicit optional meta when needed type OptionalMetaConflictError = ConflictError<{ errorCode:
 * 'RESOURCE_CONFLICT'; message: string; meta?: { resourceId?: string }; // Explicitly optional }>;
 *
 * ConflictError.of({ errorCode: 'RESOURCE_CONFLICT', message: 'Resource conflict detected', // meta is optional - can
 * omit ✅ });
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) ConflictError.of({ errorCode:
 * 'DUPLICATE' }); // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning same generic (not discriminable!) function createUser(...):
 * Result<User, ConflictError<{ errorCode: string; message: string }>> {} // BAD - not specific! function
 * createOrder(...): Result<Order, ConflictError<{ errorCode: string; message: string }>> {} // BAD - not specific! //
 * Always use literal errorCode types!
 */
const ConflictError = createAppError({
  defaultEmitLog: true,
  defaultSeverity: 'error',
  type: 'ConflictError'
});

export { ConflictError };
//# sourceMappingURL=conflict-error.js.map
