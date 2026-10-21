import { createAppError } from './app-error.js';

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

export { EmptyResultError };
//# sourceMappingURL=empty-result-error.js.map
