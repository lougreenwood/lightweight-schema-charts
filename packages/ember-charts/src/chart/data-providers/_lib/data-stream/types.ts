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

import type { DataProviderIdentifier } from '#src/chart/data-providers/_lib/abstract-data-provider/types';
import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type { TimeWindow } from '#src/chart/data-providers/_lib/data-stream/time-window';
import type {
  MakeTArgs,
  UseArgs,
} from '#src/vendor/shared-utils/type-utils/resolve-args';

/**
 * Canonical provider sample used by all providers.
 *
 * - Data/meta are provider-defined records (UnknownRecord).
 * - Time/window define the temporal context.
 * - DataProviderId/StreamId/Type make samples self-describing downstream.
 */
export interface BaseChartDataSample<
  TA extends BaseChartDataSampleTArgs = BaseChartDataSampleTArgs,
> {
  data: UseArgs<TA>['data'];
  dataProviderIdentifier: UseArgs<TA>['dataProviderIdentifier'];
  dataStreamIdentifier: UseArgs<TA>['dataStreamIdentifier'];
  meta: UseArgs<TA>['meta'];
  time: Date;
  window: TimeWindow;
}

export type BaseChartDataSampleTArgs = MakeTArgs<{
  data: object;
  dataProviderIdentifier: DataProviderIdentifier;
  dataStreamIdentifier: DataStreamIdentifier;
  meta: object;
}>;

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
export type DataStreamIdentifier<
  TA extends DataStreamIdentifierTArgs = DataStreamIdentifierTArgs,
> = Readonly<{
  dataProviderIdentifier: UseArgs<TA>['dataProviderIdentifier'];
  id: UseArgs<TA>['id'];
  type: UseArgs<TA>['type'];
  typeFamily?: UseArgs<TA>['typeFamily'];
}>;

export type DataStreamIdentifierTArgs = MakeTArgs<{
  dataProviderIdentifier: DataProviderIdentifier;
  id: string;
  type: string;
  typeFamily?: string;
}>;

/**
 * Update event for a chart data stream.
 *
 * - 'append' adds a new sample after the latest one.
 * - 'replace-latest' replaces the most recent sample (useful for versioned/latest-bar semantics).
 *
 * Uses TOpts (complete specification) rather than TArgs (partial overrides) because the nested `chartDataSample` TArgs
 * must be fully specified to pass through to `BaseChartDataSample`.
 */
export type DataStreamUpdate<
  TOpts extends DataStreamUpdateTOpts = DataStreamUpdateTOpts,
> =
  | Readonly<{
      data: BaseChartDataSample<TOpts['chartDataSample']>;
      kind: 'append';
    }>
  | Readonly<{
      data: BaseChartDataSample<TOpts['chartDataSample']>;
      kind: 'replace-latest';
    }>;

/**
 * Batch of updates for a specific stream, including the advanced cursor. Providers must not emit empty batches; emit an
 * error instead.
 *
 * Uses TOpts (complete specification) rather than TArgs (partial overrides) because the nested `chartDataSample` TArgs
 * must be fully specified to pass through to nested generics.
 */
export interface DataStreamUpdateBatch<
  TOpts extends DataStreamUpdateBatchTOpts = DataStreamUpdateBatchTOpts,
> {
  dataStreamIdentifier: UseArgs<
    TOpts['chartDataSample']
  >['dataStreamIdentifier'];
  newCursor: DataProviderCursor;
  updates: ReadonlySet<
    DataStreamUpdate<{ chartDataSample: TOpts['chartDataSample'] }>
  >;
}

export type InferDataStreamIdentifiers<TDataProvider extends DataProviderLike> =
  TDataProvider['dataStreamIdentifiers'] extends ReadonlySet<infer I>
    ? I
    : never;

type DataStreamUpdateBatchTOpts = {
  chartDataSample: BaseChartDataSampleTArgs;
};

type DataStreamUpdateTOpts = {
  chartDataSample: BaseChartDataSampleTArgs;
};
