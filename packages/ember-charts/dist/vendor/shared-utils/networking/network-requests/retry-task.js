import { duration } from '../../duration.js';
import { withRetries, Task, stopRetrying, isRetryFailed } from 'true-myth/task';

const DEFAULT_RETRY_MAX_DURATION_MS = duration('5s');
function retryTask({
  context,
  retryStrategy,
  task
}) {
  const {
    logger
  } = context;
  if ('classifyError' in retryStrategy) {
    const {
      classifyError,
      rateLimitStrategy,
      retryStrategy: normalRetryStrategy,
      timeoutMs = DEFAULT_RETRY_MAX_DURATION_MS
    } = retryStrategy;
    const state = {
      lastClassification: undefined
    };
    const normalStrategyInstance = normalRetryStrategy.strategyFactory(normalRetryStrategy.options);
    const rateLimitStrategyInstance = rateLimitStrategy.strategyFactory(rateLimitStrategy.options);
    const compositeStrategy = createDiscriminatedStrategy({
      normalStrategy: normalStrategyInstance,
      rateLimitStrategy: rateLimitStrategyInstance,
      state
    });
    const isRetryableError = error => {
      const classification = classifyError(error);
      if (classification === 'fatal') {
        return false;
      }
      state.lastClassification = classification;
      if (classification === 'rate-limit') {
        logger.warn('[retryTask] Rate limit detected, using rate-limit backoff strategy');
      }
      return true;
    };
    const retryTaskInstance = withRetries(({
      count,
      elapsed
    }) => {
      return executeWithRetryLogic({
        context: {
          logger
        },
        count,
        elapsed,
        isRetryableError,
        retryTimeoutMs: timeoutMs,
        task
      });
    }, compositeStrategy);
    return retryTaskInstance.orElse(rejection => unwrapRetryRejection({
      context: {
        logger
      },
      isRetryableError,
      rejection
    }));
  }
  const {
    isRetryableError,
    options,
    strategyFactory,
    timeoutMs = DEFAULT_RETRY_MAX_DURATION_MS
  } = retryStrategy;
  const strategy = strategyFactory(options);
  const retryTaskInstance = withRetries(({
    count,
    elapsed
  }) => {
    return executeWithRetryLogic({
      context: {
        logger
      },
      count,
      elapsed,
      isRetryableError,
      retryTimeoutMs: timeoutMs,
      task
    });
  }, strategy);
  return retryTaskInstance.orElse(rejection => unwrapRetryRejection({
    context: {
      logger
    },
    isRetryableError,
    rejection
  }));
}
function* createDiscriminatedStrategy({
  normalStrategy,
  rateLimitStrategy,
  state
}) {
  while (true) {
    const activeStrategy = state.lastClassification === 'rate-limit' ? rateLimitStrategy : normalStrategy;
    const next = activeStrategy.next();
    if (next.done) {
      return;
    }
    yield next.value;
  }
}
function executeWithRetryLogic({
  context: {
    logger
  },
  count,
  elapsed,
  isRetryableError,
  retryTimeoutMs,
  task
}) {
  if (elapsed >= retryTimeoutMs) {
    logger.warn(`[retryTask] Retry timeout exceeded (${elapsed}ms) after ${count} attempts.`);
    return Task.reject(stopRetrying(`Retry timeout exceeded (${elapsed}ms)`));
  }
  return task({
    count,
    elapsed
  }).orElse(error => {
    if (isRetryableError(error)) {
      logger.warn(`[retryTask] Retryable error encountered (Attempt ${count + 1}), scheduling retry.`);
      return Task.reject(error);
    }
    logger.error(`[retryTask] Non-retryable error encountered (Attempt ${count + 1}), stopping retries.`);
    return Task.reject(stopRetrying('Non-retryable error encountered', error));
  });
}
function unwrapRetryRejection({
  context: {
    logger
  },
  isRetryableError,
  rejection
}) {
  let finalError;
  if (isRetryFailed(rejection)) {
    logger.warn(`[retryTask] Retries failed after ${rejection.tries} attempts over ${rejection.totalDuration}ms.`);
    const lastActualError = rejection.rejections.slice().reverse().find(e => !(e instanceof Error && e.name === 'TrueMyth.Task.StopRetrying'));
    if (lastActualError) {
      finalError = lastActualError;
    } else {
      const causeMessage = rejection.cause && typeof rejection.cause === 'object' && 'message' in rejection.cause ? String(rejection.cause.message) : 'Unknown';
      const message = `Retries failed but no specific error identified. Cause: ${causeMessage}`;
      finalError = new Error(message, {
        cause: rejection.cause instanceof Error ? rejection.cause : undefined
      });
      logger.error('[retryTask] Could not identify last specific error during RetryFailed mapping.');
    }
    if (rejection.cause instanceof Error && rejection.cause.name === 'TrueMyth.Task.StopRetrying' && rejection.cause.message.includes('timeout exceeded')) {
      logger.warn(`[retryTask] Failure cause: Timeout.`);
    }
  } else if (rejection instanceof Error && rejection.name === 'TrueMyth.Task.StopRetrying') {
    const cause = rejection.cause;
    if (cause instanceof Error && isRetryableError(cause) === false) {
      finalError = cause;
    } else {
      const message = `Stopped retrying: ${rejection.message}. Cause: ${cause instanceof Error ? cause.message : 'Unknown'}`;
      finalError = new Error(message, {
        cause: cause instanceof Error ? cause : undefined
      });
      logger.warn('[retryTask] Could not identify specific non-retryable error during StopRetrying mapping.');
    }
    logger.warn(`[retryTask] Stopped retrying explicitly.`);
  } else {
    finalError = rejection;
  }
  return Task.reject(finalError);
}

export { retryTask };
//# sourceMappingURL=retry-task.js.map
