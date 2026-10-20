/**
 * Embedded shape for bounded time windows.
 */
export interface TimeWindow {
  /**
   * End of the time window.
   */
  readonly close: Date;

  /**
   * Start of the time window.
   */
  readonly open: Date;
}
