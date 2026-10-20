import type { HasLogger } from '#src/vendor/shared-utils/logger/types';
import type {
  DiscriminatedRetryStrategy,
  TaskRetryStrategyFactory,
  TaskRetryStrategyOptions,
} from '#src/vendor/shared-utils/networking/network-requests/retry-task/types';
import type { Result, Task } from 'true-myth';

export type PollingStrategy =
  | (DiscriminatedRetryStrategy<unknown> & { timeoutMs?: number })
  | SimplePollingStrategy;

export interface PollingTaskOptions<T, E> {
  context: HasLogger;
  pollId: string;
  pollingStrategy: PollingStrategy;
  onPollResult: (args: {
    count: number;
    elapsed: number;
    result: Result<T, E>;
  }) => void;
  shouldContinuePolling: (args: { count: number; elapsed: number }) => boolean;
  task: (args: { count: number; elapsed: number }) => Task<T, E>;
}

export interface SimplePollingStrategy {
  options?: TaskRetryStrategyOptions;
  strategyFactory: TaskRetryStrategyFactory;
}
