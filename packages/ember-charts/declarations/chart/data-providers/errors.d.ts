import { EmptyResultError } from '../../vendor/shared-utils/errors/empty-result-error';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error';
import { PreconditionError } from '../../vendor/shared-utils/errors/precondition-error';
import { ValidationError } from '../../vendor/shared-utils/errors/validation-error';
/**
 * Error when creating a data provider with a mismatched id.
 *
 * This indicates the provided identifier's id doesn't match any expected identifier.
 */
export type CreateDataProviderInvalidIdError = ValidationError<{
    errorCode: 'CREATE_DATA_PROVIDER_INVALID_ID';
    message: string;
    meta: {
        expected: string;
        received: string;
    };
}>;
/**
 * Error when creating a data provider with a mismatched type.
 *
 * This indicates the provided identifier's type doesn't match any expected type.
 */
export type CreateDataProviderInvalidTypeError = ValidationError<{
    errorCode: 'CREATE_DATA_PROVIDER_INVALID_TYPE';
    message: string;
    meta: {
        expected: string;
        received: string;
    };
}>;
/**
 * Error when a cursor is requested for a stream that has not established one yet.
 *
 * This is an expected condition during initial data fetch or before the first successful data retrieval.
 */
export type DataProviderNoCursorForStreamError = NotFoundError<{
    errorCode: 'DATA_PROVIDER_NO_CURSOR_FOR_STREAM';
    message: string;
    meta: {
        streamId: string;
    };
}>;
/**
 * Error when no new data is available since the provided cursor.
 *
 * This is an expected condition - not a true error - indicating the data is up-to-date. Providers must never emit empty
 * update sets; they should return this error instead.
 */
export type DataProviderNoNewDataError = EmptyResultError<{
    errorCode: 'DATA_PROVIDER_NO_NEW_DATA';
    message: string;
    meta?: {
        streamId?: string;
    };
}>;
/**
 * Error when callers reference an unknown stream id.
 *
 * This indicates the requested stream identifier doesn't exist in the provider's known streams.
 */
export type DataProviderUnknownStreamError = NotFoundError<{
    errorCode: 'DATA_PROVIDER_UNKNOWN_STREAM';
    message: string;
    meta: {
        streamId: string;
    };
}>;
/**
 * Error when a data stream has no data available.
 *
 * This indicates the stream exists but contains no data samples.
 */
export type DataStreamHasNoDataError = EmptyResultError<{
    errorCode: 'DATA_STREAM_HAS_NO_DATA';
    message: string;
    meta: {
        streamId: string;
    };
}>;
/**
 * Error when attempting to get configuration for a data stream that does not support configuration.
 *
 * This is a precondition error because the stream type itself does not support configuration (e.g., ticker streams),
 * not because the stream doesn't exist or the config is temporarily unavailable.
 */
export type DataStreamNotConfigurablePreconditionError = PreconditionError<{
    errorCode: 'DATA_STREAM_NOT_CONFIGURABLE';
    message: string;
    meta: {
        streamId: string;
    };
}>;
/**
 * Create a CreateDataProviderInvalidIdError
 */
export declare function createDataProviderInvalidIdError({ expected, received, }: {
    expected: string;
    received: string;
}): CreateDataProviderInvalidIdError;
/**
 * Create a CreateDataProviderInvalidTypeError
 */
export declare function createDataProviderInvalidTypeError({ expected, received, }: {
    expected: string;
    received: string;
}): CreateDataProviderInvalidTypeError;
/**
 * Create a DataProviderNoCursorForStreamError.
 *
 * This is an expected lifecycle condition — streams have no cursor until their first successful data fetch. Severity is
 * downgraded to debug and log emission is suppressed to avoid noisy warnings during normal initialization and reactive
 * derivation cycles.
 */
export declare function createDataProviderNoCursorForStreamError({ streamId, }: {
    streamId: string;
}): DataProviderNoCursorForStreamError;
/**
 * Create a DataProviderNoNewDataError
 */
export declare function createDataProviderNoNewDataError({ message, streamId, }?: {
    message?: string;
    streamId?: string;
}): DataProviderNoNewDataError;
/**
 * Create a DataProviderUnknownStreamError
 */
export declare function createDataProviderUnknownStreamError({ streamId, }: {
    streamId: string;
}): DataProviderUnknownStreamError;
/**
 * Create a DataStreamHasNoDataError
 */
export declare function createDataStreamHasNoDataError({ streamId, }: {
    streamId: string;
}): DataStreamHasNoDataError;
/**
 * Create a DataStreamNotConfigurablePreconditionError
 */
export declare function createDataStreamNotConfigurableError({ streamId, }: {
    streamId: string;
}): DataStreamNotConfigurablePreconditionError;
//# sourceMappingURL=errors.d.ts.map