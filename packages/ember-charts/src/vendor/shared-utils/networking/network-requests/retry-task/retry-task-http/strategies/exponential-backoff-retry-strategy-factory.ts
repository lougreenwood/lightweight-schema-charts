import type {
  TaskRetryStrategyFactory,
  TaskRetryStrategyOptions,
} from '#src/vendor/shared-utils/networking/network-requests/retry-task/retry-task-http/types';
import type { Strategy } from 'true-myth/task/delay';

import * as Delay from 'true-myth/task/delay';

const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 150;

export const exponentialBackoffRetryStrategyFactory: TaskRetryStrategyFactory =
  ({
    baseRetryDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
    maxRetries = DEFAULT_RETRY_MAX_ATTEMPTS,
  }: TaskRetryStrategyOptions = {}): Strategy => {
    const retryDelaysCount = Math.max(0, maxRetries - 1);

    return Delay.exponential({ from: baseRetryDelayMs, withFactor: 2 })
      .map(Delay.jitter)
      .take(retryDelaysCount);
  };
