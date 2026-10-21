import { NotFoundError } from '../../../../vendor/shared-utils/errors/not-found-error.js';

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

export { createNoSeriesAdapterForTypeError };
//# sourceMappingURL=errors.js.map
