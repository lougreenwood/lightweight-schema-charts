import type { SeriesType } from './types';
import type { NotFoundError } from '../../../../vendor/shared-utils/errors/not-found-error';
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
export declare function createNoSeriesAdapterForTypeError({ seriesType, }: {
    seriesType: SeriesType;
}): NoSeriesAdapterForTypeError;
//# sourceMappingURL=errors.d.ts.map