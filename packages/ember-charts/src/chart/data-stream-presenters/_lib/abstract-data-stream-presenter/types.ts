/** A presenter owns the value shape; a selected value handler interprets it for the adapter. */
export interface ProjectedSeriesPoint {
  readonly time: Date;
  readonly value: unknown;
}
