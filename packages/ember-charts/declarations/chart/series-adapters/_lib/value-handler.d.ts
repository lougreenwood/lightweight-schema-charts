import type { ProjectedSeriesPoint } from '../../data-stream-presenters/_lib/abstract-data-stream-presenter/types';
import type { SeriesAdapterInternalPoint } from './_adapter';
import type { SeriesType } from './_registry/types';
import type { SeriesValueNumberValidationError, SeriesValueOhlcConverterMissingError, SeriesValueOhlcValidationError, SeriesValuePointsEmptyError } from './value-handler/errors';
import type { InterpretedOhlc, SeriesValueHandler } from './value-handler/types';
import { type Result } from 'true-myth/result';
export declare function validateSeriesNumber(value: unknown): Result<number, SeriesValueNumberValidationError>;
export declare function validateSeriesOhlc(value: unknown): Result<InterpretedOhlc, SeriesValueOhlcValidationError>;
/** The default validates numeric values; it never unwraps consumer domain objects. */
export declare const numericSeriesValueHandler: SeriesValueHandler;
/** Interpret a non-empty batch before mutating an upstream series. */
export declare function interpretProjectedPoints({ points, handler, seriesKind, }: {
    points: ReadonlySet<ProjectedSeriesPoint>;
    handler: SeriesValueHandler;
    seriesKind: SeriesType;
}): Result<ReadonlySet<SeriesAdapterInternalPoint>, SeriesValueNumberValidationError | SeriesValueOhlcValidationError | SeriesValueOhlcConverterMissingError | SeriesValuePointsEmptyError>;
//# sourceMappingURL=value-handler.d.ts.map