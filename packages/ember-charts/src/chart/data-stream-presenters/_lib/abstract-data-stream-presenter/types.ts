import type { DataProviderLike } from '../../../data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '../../../data-providers/_lib/data-stream/types';
import type { HasConfigValues } from '../data-stream-presenter-like';
import type { MakeTArgs } from '../../../../vendor/shared-utils/type-utils/resolve-args';

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
