import type { SeriesType } from '#src/chart/series-adapters/_lib/_registry/types';
import type { NotFoundError } from '#src/vendor/shared-utils/errors/not-found-error';

import { NotFoundError as NotFoundErrorFactory } from '#src/vendor/shared-utils/errors/not-found-error';

/**
 * Error when no series adapter is registered for the requested series type.
 *
 * This indicates the series type is not supported by the current adapter registry.
 */
export type NoSeriesAdapterForTypeError = NotFoundError<{
  errorCode: 'NO_SERIES_ADAPTER_FOR_TYPE';
  message: string;
  meta: {
    seriesType: SeriesType;
  };
}>;

/**
 * Create a NoSeriesAdapterForTypeError
 */
export function createNoSeriesAdapterForTypeError({
  seriesType,
}: {
  seriesType: SeriesType;
}): NoSeriesAdapterForTypeError {
  return NotFoundErrorFactory.of({
    errorCode: 'NO_SERIES_ADAPTER_FOR_TYPE',
    message: `No series adapter registered for type: ${seriesType}`,
    meta: { seriesType },
  });
}
