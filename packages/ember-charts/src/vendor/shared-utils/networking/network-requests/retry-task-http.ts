import type { AppErrorArgs } from '../../errors/app-error';
import type { AppError } from '../../errors/app-error';
import type { AbortableHttpError } from './fetch-task/errors';
import type { RetryTaskHttpOptions } from './retry-task/retry-task-http/types';
import type { Maybe, Task } from 'true-myth';

import { retryTask } from './retry-task';
import { exponentialBackoffRetryStrategyFactory } from './retry-task/retry-task-http/strategies/exponential-backoff-retry-strategy-factory';
import { just, nothing } from 'true-myth/maybe';

export function isHttpErrorRetryable(
  error: AppError<AppErrorArgs & AppErrorArgs>,
): Maybe<boolean> {
  switch (error.errorCode) {
    case 'HTTP_4XX_CLIENT_ERROR':
      return just(false);
    case 'HTTP_5XX_SERVER_ERROR':
      return just(true);
    case 'HTTP_200_INVALID_RESPONSE_STRUCTURE':
      return just(false);
    case 'HTTP_204_NO_CONTENT':
      return just(true);
    case 'HTTP_401_UNAUTHORIZED':
      return just(false);
    case 'HTTP_403_FORBIDDEN':
      return just(false);
    case 'HTTP_404_NOT_FOUND':
      return just(false);
    case 'HTTP_408_TIMEOUT':
      return just(true);
    case 'HTTP_429_RATE_LIMITED':
      return just(true);
    case 'HTTP_FETCH_ABORTED':
      return just(false);
    case 'HTTP_NETWORK_UNAVAILABLE':
      return just(true);
    case 'HTTP_UNKNOWN_ERROR':
      return just(true);
    default:
      return nothing();
  }
}

export function retryTaskHttp<T, E extends AbortableHttpError>({
  context,
  retryStrategy,
  task,
}: RetryTaskHttpOptions<T, E>): Task<T, E> {
  const {
    isRetryableError = (error: E) =>
      isHttpErrorRetryable(error).unwrapOr(false),
    options,
    strategyFactory = exponentialBackoffRetryStrategyFactory,
    timeoutMs,
  } = retryStrategy ?? {};

  return retryTask({
    context,
    task,
    retryStrategy: {
      isRetryableError,
      ...(options !== undefined ? { options } : {}),
      strategyFactory,
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    },
  });
}
