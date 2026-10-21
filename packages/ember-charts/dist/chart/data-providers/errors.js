import { EmptyResultError } from '../../vendor/shared-utils/errors/empty-result-error.js';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error.js';
import { PreconditionError } from '../../vendor/shared-utils/errors/precondition-error.js';
import { ValidationError } from '../../vendor/shared-utils/errors/validation-error.js';

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
 * This is a precondition error because the stream type itself does not support configuration (e.g., ticker streams),
 * not because the stream doesn't exist or the config is temporarily unavailable.
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
 * Create a DataStreamNotConfigurablePreconditionError
 */
function createDataStreamNotConfigurableError({
  streamId
}) {
  return PreconditionError.of({
    errorCode: 'DATA_STREAM_NOT_CONFIGURABLE',
    message: `Data stream '${streamId}' does not support configuration`,
    meta: {
      streamId
    }
  });
}

export { createDataProviderInvalidIdError, createDataProviderInvalidTypeError, createDataProviderNoCursorForStreamError, createDataProviderNoNewDataError, createDataProviderUnknownStreamError, createDataStreamHasNoDataError, createDataStreamNotConfigurableError };
//# sourceMappingURL=errors.js.map
