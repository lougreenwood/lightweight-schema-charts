import * as Delay from 'true-myth/task/delay';

const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const fixedDelayRetryStrategyFactory = ({
  baseRetryDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
  maxRetries = DEFAULT_RETRY_MAX_ATTEMPTS
} = {}) => {
  const retryDelaysCount = Math.max(0, maxRetries - 1);
  return Delay.fixed({
    at: baseRetryDelayMs
  }).take(retryDelaysCount);
};

export { fixedDelayRetryStrategyFactory };
//# sourceMappingURL=fixed-delay-retry-strategy-factory.js.map
