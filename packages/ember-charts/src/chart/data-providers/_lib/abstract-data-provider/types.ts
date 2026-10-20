import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type {
  DataStreamIdentifier,
  DataStreamIdentifierTArgs,
} from '#src/chart/data-providers/_lib/data-stream/types';
import type {
  CreateDataProviderInvalidIdError,
  CreateDataProviderInvalidTypeError,
} from '#src/chart/data-providers/errors';
import type { AppError } from '#src/vendor/shared-utils/errors/app-error';
import type { MakeTArgs } from '#src/vendor/shared-utils/type-utils/resolve-args';
import type { Result } from 'true-myth';
import type { Constructor } from 'type-fest';

/**
 * AbstractDataProviderTArgs
 *
 * TArgs V2 shape for AbstractDataProvider. Allows callers to override the dataProviderStatic field to narrow type
 * inference for the concrete provider implementation.
 */
export type AbstractDataProviderTArgs = MakeTArgs<DataProviderInstanceArgs>;

/**
 * DataProviderIdentifier
 *
 * - Canonical identity for a provider instance
 * - Type: 'ticker' | 'indicatorGroup' | ...
 * - Id: stable instance id (e.g. 'ticker', collection id, etc.)
 *
 * Uses legacy TArgsInput/_TArgs couplet for type narrowing at call sites.
 */
export type DataProviderIdentifier<
  TArgsInput extends Partial<DataProviderIdentifierArgs> =
    Partial<DataProviderIdentifierArgs>,
  _TArgs extends DataProviderIdentifierArgs = DataProviderIdentifierArgs &
    TArgsInput,
> = Readonly<{
  id: _TArgs['id'];
  type: _TArgs['type'];
}>;

/**
 * DataProviderInstanceArgs
 *
 * Generic arguments for typing a DataProvider instance. References the concrete static type. The instance derives all
 * type information from the static and the structural return types of its adapter methods, making the implementation
 * the single source of truth.
 */
export interface DataProviderInstanceArgs<
  TDataProviderStatic extends DataProviderStatic = DataProviderStatic,
> {
  /**
   * Reference to the concrete static type
   */
  dataProviderStatic: TDataProviderStatic;
}

/**
 * Context passed to provider factories.
 *
 * Contains the MarketDataData stream, pre-filtered indicator providers, and the TradableAssetPair for this chart instance.
 *
 * - `marketDataDataStream`: The MarketDataData stream for this chart (resolved at the chart boundary — one stream per chart).
 * - `indicatorProviders`: Pre-filtered indicator providers matching this chart's marketDataDataStream stream. Providers use this
 *   instead of accessing the full set of providers.
 * - `tradableAssetPair`: The TradableAssetPair for asset identity (base/quote assets, pair name).
 */
export type DataProviderInstanceContext = Readonly<{
  indicatorProviders: readonly unknown[];
  marketDataDataStream: unknown;
  tradableAssetPair: unknown;
}>;

/**
 * DataProviderStatic
 *
 * Interface for the static side of a DataProvider class. Uses a minimal generic constraint to preserve the
 * getDataSource return type from concrete implementations while maintaining structural typing for other members. The
 * identifier type is derived from the return type of discoverIdentifiers, making the implementation the single source
 * of truth.
 */
export interface DataProviderStatic<
  TDataSource = unknown,
  TCreateError extends AppError = AppError,
> {
  readonly dataSampleSource: Constructor<object>;

  readonly dataStreamIdentifiers: ReadonlySet<
    DataStreamIdentifier<DataStreamIdentifierTArgs>
  >;

  create(args: {
    context: DataProviderInstanceContext;
    identifier: DataProviderIdentifier;
  }): Result<
    DataProviderLike,
    | CreateDataProviderInvalidIdError
    | CreateDataProviderInvalidTypeError
    | TCreateError
  >;

  discoverIdentifiers(
    context: DataProviderInstanceContext,
  ): ReadonlySet<DataProviderIdentifier>;

  getDataSource(args: {
    context: DataProviderInstanceContext;
    identifier: DataProviderIdentifier;
  }): Result<TDataSource, TCreateError>;
}

/**
 * Infers the identifier type exposed by a DataProvider's static discoverIdentifiers method.
 *
 * Given a DataProviderStatic, this extracts the element type contained in the ReadonlySet returned by its
 * discoverIdentifiers function.
 *
 * For example, if discoverIdentifiers returns ReadonlySet<MyIdentifier>, this resolves to MyIdentifier; otherwise, it
 * resolves to DataProviderIdentifier (the base type).
 *
 * @typeParam T - A concrete DataProviderStatic whose discovered identifier type is to be inferred.
 */
export type InferDataProviderIdentifier<T extends DataProviderStatic> =
  ReturnType<T['discoverIdentifiers']> extends ReadonlySet<
    infer U extends DataProviderIdentifier
  >
    ? U
    : DataProviderIdentifier;

/**
 * Infers the data source type from a DataProvider's static getDataSource method.
 *
 * Given a DataProviderStatic, this extracts the success type from the Result returned by getDataSource. Since
 * getDataSource now returns Result<TDataSource, TError>, this unwraps the Result to get TDataSource.
 *
 * @typeParam T - A concrete DataProviderStatic whose data source type is to be inferred.
 */
export type InferDataSource<T extends DataProviderStatic> =
  ReturnType<T['getDataSource']> extends Result<infer TDataSource, unknown>
    ? TDataSource
    : never;

/**
 * Type describing the default values for the generic args passed to `DataProviderIdentifier` type as an object
 */
type DataProviderIdentifierArgs = { id: string; type: string };
