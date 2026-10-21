import {
  createAppError,
  type GenericErrorArgs,
  type GenericErrorInstance,
} from './app-error';

/**
 * PausedError instance type - use this in type positions.
 *
 * @example Type TickerUpdatesPausedError = PausedError<{ errorCode: 'TICKER_UPDATES_PAUSED'; message: string; meta?: {
 * operation: string }; }>;
 */
export type PausedError<TOpts extends GenericErrorArgs> = GenericErrorInstance<{
  errorCode: TOpts['errorCode'];
  errorGroup: TOpts['errorGroup'];
  message: TOpts['message'];
  meta: TOpts['meta'];
  type: 'PausedError';
}>;

/**
 * Generic error for when an operation is paused by user configuration or system state.
 *
 * ⚠️ CRITICAL: This is a BLUEPRINT, not a ready-to-use error. You MUST provide a specific `errorCode` at instantiation
 * time to make it discriminable.
 *
 * Use this for trader updates paused, screener fetch paused, or any user/system controlled pause state.
 *
 * @example // ✅ CORRECT: Define specific error type with errorCode type TickerUpdatesPausedError = PausedError<{
 * errorCode: 'TICKER_UPDATES_PAUSED'; meta: { operation: 'updateWatchlistTickers' }; }>;
 *
 * // Use in function return type function updateWatchlistTickers(): Result<void, TickerUpdatesPausedError> { return
 * Result.err( PausedError.of({ errorCode: 'TICKER_UPDATES_PAUSED', message: 'Watchlist ticker updates are paused',
 * meta: { operation: 'updateWatchlistTickers' }, }), ); }
 *
 * @example // ✅ CORRECT: Multiple variants from the same blueprint type ScreenerPausedError = PausedError<{ errorCode:
 * 'SCREENER_PAUSED'; message: string; meta?: { operation: string }; }>; type TraderPausedError = PausedError<{
 * errorCode: 'TRADER_PAUSED'; message: string; meta?: { operation: string }; }>;
 *
 * // Discriminate on errorCode function handlePauseError(error: ScreenerPausedError | TraderPausedError) { switch
 * (error.errorCode) { case 'SCREENER_PAUSED': // Handle screener paused break; case 'TRADER_PAUSED': // Handle trader
 * paused break; } }
 *
 * @example // ❌ WRONG: Using without errorCode or message (compilation error!) PausedError.of({ errorCode: 'PAUSED' });
 * // ERROR: message is required
 *
 * @example // ❌ WRONG: Multiple functions returning the same generic (not discriminable!) function a(): Result<A,
 * PausedError<{ errorCode: string; message: string }>> {} // BAD - not specific! function b(): Result<B, PausedError<{
 * errorCode: string; message: string }>> {} // BAD - not specific! // Always use literal errorCode types!
 */
export const PausedError = createAppError({
  defaultEmitLog: false,
  defaultSeverity: 'info', // Pausing is often expected/benign
  type: 'PausedError',
});
