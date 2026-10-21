import { retryTask } from './retry-task.js';
import { exponentialBackoffRetryStrategyFactory } from './retry-task/retry-task-http/strategies/exponential-backoff-retry-strategy-factory.js';
import { nothing, just } from 'true-myth/maybe';

function isHttpErrorRetryable(error) {
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
function retryTaskHttp({
  context,
  retryStrategy,
  task
}) {
  const {
    isRetryableError = error => isHttpErrorRetryable(error).unwrapOr(false),
    options,
    strategyFactory = exponentialBackoffRetryStrategyFactory,
    timeoutMs
  } = retryStrategy ?? {};
  return retryTask({
    context,
    task,
    retryStrategy: {
      isRetryableError,
      ...(options !== undefined ? {
        options
      } : {}),
      strategyFactory,
      ...(timeoutMs !== undefined ? {
        timeoutMs
      } : {})
    }
  });
}

export { isHttpErrorRetryable, retryTaskHttp };
//# sourceMappingURL=retry-task-http.js.map
