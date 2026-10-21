import type { HasLogger } from '../../../../logger/types';
import type { AbortableHttpError } from '../../fetch-task/errors';
import type { Task } from 'true-myth';
import type { Strategy } from 'true-myth/task/delay';

export type RetryTaskHttpOptions<T, E extends AbortableHttpError> = {
  context: HasLogger;
  retryStrategy?: {
    options?: TaskRetryStrategyOptions;
    strategyFactory: TaskRetryStrategyFactory;
    timeoutMs?: number;
    isRetryableError?: (error: E) => boolean;
  };
  task: () => Task<T, E>;
};

export type TaskRetryStrategyFactory = (
  options?: TaskRetryStrategyOptions,
) => Strategy;

export interface TaskRetryStrategyOptions {
  baseRetryDelayMs?: number;
  maxRetries?: number;
}
