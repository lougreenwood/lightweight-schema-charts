import type { HasLogger } from '#src/vendor/shared-utils/logger/types';
import type { Task } from 'true-myth';
import type { Strategy } from 'true-myth/task/delay';

export interface DiscriminatedRetryStrategy<E> {
  rateLimitStrategy: {
    options?: TaskRetryStrategyOptions;
    strategyFactory: TaskRetryStrategyFactory;
  };
  retryStrategy: {
    options?: TaskRetryStrategyOptions;
    strategyFactory: TaskRetryStrategyFactory;
  };
  classifyError: (error: E) => ErrorClassification;
}

export type ErrorClassification = 'fatal' | 'rate-limit' | 'retry';
export type RetryStrategy<T, E> = RetryTaskOptions<T, E>['retryStrategy'];

export type RetryTaskOptions<T, E> = {
  context: HasLogger;
  retryStrategy:
    | (DiscriminatedRetryStrategy<E> & { timeoutMs?: number })
    | SimpleRetryStrategy<E>;
  task: (args: { count: number; elapsed: number }) => Task<T, E>;
};

export interface SimpleRetryStrategy<E> {
  options?: TaskRetryStrategyOptions;
  strategyFactory: TaskRetryStrategyFactory;
  timeoutMs?: number;
  isRetryableError: (error: E) => boolean;
}

export type TaskRetryStrategyFactory = (
  options?: TaskRetryStrategyOptions,
) => Strategy;

export interface TaskRetryStrategyOptions {
  baseRetryDelayMs?: number;
  maxRetries?: number;
}
