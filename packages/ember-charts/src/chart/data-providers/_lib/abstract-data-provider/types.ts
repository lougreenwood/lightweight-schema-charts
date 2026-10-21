import type { AppErrorArgs } from '../../../../vendor/shared-utils/errors/app-error';
import type { DataProviderLike } from '../data-provider-like';
import type { DataStreamIdentifier } from '../data-stream/types';
import type {
  CreateDataProviderInvalidIdError,
  CreateDataProviderInvalidTypeError,
} from '../../errors';
import type { AppError } from '../../../../vendor/shared-utils/errors/app-error';
import type { Result } from 'true-myth';
import type { Constructor } from 'type-fest';

/**
 * DataProviderIdentifier
 *
 * - Canonical identity for a provider instance
 * - Type: 'ticker' | 'indicatorGroup' | ...
 * - Id: stable instance id (e.g. 'ticker', collection id, etc.)
 *
 * Consumers narrow identity by extending this structural interface.
 */
export interface DataProviderIdentifier {
  readonly id: string;
  readonly type: string;
}

/**
 * DataProviderStatic
 *
 * Interface for the static side of a DataProvider class. Uses a minimal generic constraint to preserve the
 * getDataSource return type from concrete implementations while maintaining structural typing for other members. The
 * identifier type is derived from the return type of discoverIdentifiers, making the implementation the single source
 * of truth.
 */
export interface DataProviderStatic<
  TDataSource,
  TCreateError extends AppError<AppErrorArgs>,
  TContext extends object,
> {
  readonly dataSampleSource: Constructor<object>;

  readonly dataStreamIdentifiers: ReadonlySet<DataStreamIdentifier>;

  create(args: {
    context: TContext;
    identifier: DataProviderIdentifier;
  }): Result<
    DataProviderLike,
    | CreateDataProviderInvalidIdError
    | CreateDataProviderInvalidTypeError
    | TCreateError
  >;

  discoverIdentifiers(context: TContext): ReadonlySet<DataProviderIdentifier>;

  getDataSource(args: {
    context: TContext;
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
export type InferDataProviderIdentifier<
  TDataProviderStatic extends DataProviderStatic<
    unknown,
    AppError<AppErrorArgs>,
    object
  >,
> =
  ReturnType<TDataProviderStatic['discoverIdentifiers']> extends ReadonlySet<
    infer TIdentifier extends DataProviderIdentifier
  >
    ? TIdentifier
    : DataProviderIdentifier;

/**
 * Infers the data source type from a DataProvider's static getDataSource method.
 *
 * Given a DataProviderStatic, this extracts the success type from the Result returned by getDataSource. Since
 * getDataSource now returns Result<TDataSource, TError>, this unwraps the Result to get TDataSource.
 *
 * @typeParam T - A concrete DataProviderStatic whose data source type is to be inferred.
 */
export type InferDataSource<
  TDataProviderStatic extends DataProviderStatic<
    unknown,
    AppError<AppErrorArgs>,
    object
  >,
> =
  ReturnType<TDataProviderStatic['getDataSource']> extends Result<
    infer TDataSource,
    unknown
  >
    ? TDataSource
    : never;
