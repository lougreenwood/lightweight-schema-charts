import type { GroupId, SeriesPath } from '../../../schema/types';
import type { ChartTimeSeriesPointOhlc } from '../_adapter';
import type { SeriesValueHandlerNotFoundError, SeriesValueNumberValidationError, SeriesValueOhlcConverterMissingError, SeriesValueOhlcValidationError, SeriesValuePointsEmptyError } from './errors';
import type { PriceFormatCustom } from 'lightweight-charts';
import type { Result } from 'true-myth/result';
export type InterpretedOhlc = ChartTimeSeriesPointOhlc['value'];
/** Handlers return typed failures instead of throwing on unsupported consumer values. */
export interface SeriesValueHandler {
    readonly id: string;
    readonly priceFormat?: PriceFormatCustom;
    toNumber(value: unknown): Result<number, SeriesValueNumberValidationError>;
    toOhlc?(value: unknown): Result<InterpretedOhlc, SeriesValueOhlcValidationError>;
}
export type SeriesValueHandlers = ReadonlyArray<SeriesValueHandler>;
/** Terminal notification from the modifier, without copying the consumer's raw value into diagnostics. */
export interface SeriesValueFailure {
    readonly error: SeriesValueHandlerNotFoundError | SeriesValueNumberValidationError | SeriesValueOhlcConverterMissingError | SeriesValueOhlcValidationError | SeriesValuePointsEmptyError;
    readonly fieldPath: SeriesPath;
    readonly groupId: GroupId;
}
//# sourceMappingURL=types.d.ts.map