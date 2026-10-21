import * as Delay from 'true-myth/task/delay';

const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 150;
const exponentialBackoffRetryStrategyFactory = ({
  baseRetryDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
  maxRetries = DEFAULT_RETRY_MAX_ATTEMPTS
} = {}) => {
  const retryDelaysCount = Math.max(0, maxRetries - 1);
  return Delay.exponential({
    from: baseRetryDelayMs,
    withFactor: 2
  }).map(Delay.jitter).take(retryDelaysCount);
};

export { exponentialBackoffRetryStrategyFactory };
//# sourceMappingURL=exponential-backoff-retry-strategy-factory.js.map
