/**
 * Data stream primitives (unified model)
 *
 * This module defines a minimal, provider-agnostic contract centered on a single, canonical sample shape named
 * ChartDataSample
 *
 * Key concepts:
 *
 * - DataStreamIdentifier: logical stream identity (string id).
 * - DataProviderCursor: per-stream cursor for pagination/progress.
 * - ChartDataSample: canonical provider sample (data/meta/time/window + identity).
 * - DataStreamUpdate/Batch: transport envelopes for append/replace semantics.
 * - Errors: Unknown stream, missing cursor, and no-new-data.
 *
 * Notes:
 *
 * - No `any`, no `null`. Use UnknownRecord for data/meta generics.
 * - Keep this module small and stable; providers and registries compose on top.
 */
import type { DataProviderIdentifier } from '../abstract-data-provider/types';
import type { DataProviderLike } from '../data-provider-like';
import type { TimeWindow } from './time-window';
/**
 * Canonical provider sample used by all providers.
 *
 * - Data/meta are provider-defined records (UnknownRecord).
 * - Time/window define the temporal context.
 * - DataProviderId/StreamId/Type make samples self-describing downstream.
 */
export interface BaseChartDataSample<TData extends object, TMeta extends object, TDataStreamIdentifier extends DataStreamIdentifier> {
    data: TData;
    dataProviderIdentifier: TDataStreamIdentifier['dataProviderIdentifier'];
    dataStreamIdentifier: TDataStreamIdentifier;
    meta: TMeta;
    time: Date;
    window: TimeWindow;
}
/**
 * Cursor for stream pagination/progress.
 *
 * - Time is required and expressed as epoch millis.
 * - Version is optional for future overwrite/versioned flows.
 */
export interface DataProviderCursor {
    time: number;
    version?: number;
}
/**
 * Template-friendly stream identifier for a logical data stream. Providers may expose one or more stream identifiers.
 */
export interface DataStreamIdentifier {
    readonly dataProviderIdentifier: DataProviderIdentifier;
    readonly id: string;
    readonly type: string;
    readonly typeFamily?: string;
}
/**
 * Update event for a chart data stream.
 *
 * - 'append' adds a new sample after the latest one.
 * - 'replace-latest' replaces the most recent sample (useful for versioned/latest-bar semantics).
 *
 * The sample type preserves the consumer's data, metadata, and stream identity.
 */
export type DataStreamUpdate<TDataSample extends BaseChartDataSample<object, object, DataStreamIdentifier>> = Readonly<{
    data: TDataSample;
    kind: 'append';
}> | Readonly<{
    data: TDataSample;
    kind: 'replace-latest';
}>;
/**
 * Batch of updates for a specific stream, including the advanced cursor. Providers must not emit empty batches; emit an
 * error instead.
 *
 * The stream identifier and update samples share the same consumer-supplied sample type.
 */
export interface DataStreamUpdateBatch<TDataSample extends BaseChartDataSample<object, object, DataStreamIdentifier>> {
    dataStreamIdentifier: TDataSample['dataStreamIdentifier'];
    newCursor: DataProviderCursor;
    updates: ReadonlySet<DataStreamUpdate<TDataSample>>;
}
export type InferDataStreamIdentifiers<TDataProvider extends DataProviderLike> = TDataProvider['dataStreamIdentifiers'] extends ReadonlySet<infer TIdentifier> ? TIdentifier : never;
//# sourceMappingURL=types.d.ts.map