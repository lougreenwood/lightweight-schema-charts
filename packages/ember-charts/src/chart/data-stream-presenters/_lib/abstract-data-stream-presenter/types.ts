import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '#src/chart/data-providers/_lib/data-stream/types';
import type { HasConfigValues } from '#src/chart/data-stream-presenters/_lib/data-stream-presenter-like';
import type { MakeTArgs } from '#src/vendor/shared-utils/type-utils/resolve-args';

/**
 * TArgs for AbstractDataStreamPresenter.
 *
 * Structured generic object for data stream presenter type parameters.
 *
 * @property dataProvider         - The data provider instance that owns this presenter's data stream
 * @property dataStreamIdentifier - The data stream identifier for this presenter
 * @property dataSource           - Optional data source type for this presenter (determines configurability)
 *
 *   - If `dataSource` is provided and extends `HasConfigValues`, the presenter is configurable
 *   - If `dataSource` is omitted or undefined, the presenter is non-configurable
 */
export type AbstractDataStreamPresenterTArgs = MakeTArgs<{
  readonly dataProvider: DataProviderLike;
  readonly dataSource?: HasConfigValues;
  readonly dataStreamIdentifier: DataStreamIdentifier;
}>;
