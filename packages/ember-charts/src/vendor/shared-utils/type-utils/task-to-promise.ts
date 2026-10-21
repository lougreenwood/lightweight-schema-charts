import type { AppErrorArgs } from '../errors/app-error';
import type { AppError } from '../errors/app-error';
import type { Result } from 'true-myth/result';

export type ToPromise<
  TSuccess,
  TError extends AppError<AppErrorArgs & AppErrorArgs>,
> = Promise<Result<TSuccess, TError>>;
