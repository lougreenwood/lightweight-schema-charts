import { retryTask } from './retry-task.js';
import { Task, Result } from 'true-myth';

const CONTINUE_POLLING = Symbol('CONTINUE_POLLING');
function pollingTask({
  context: {
    logger
  },
  onPollResult,
  pollId,
  pollingStrategy,
  shouldContinuePolling,
  task
}) {
  const logPrefix = `[pollingTask:${pollId}]`;
  logger.info(`${logPrefix} Starting polling`);
  let wrappedStrategy;
  if ('classifyError' in pollingStrategy) {
    const discriminated = pollingStrategy;
    wrappedStrategy = {
      rateLimitStrategy: discriminated.rateLimitStrategy,
      retryStrategy: discriminated.retryStrategy,
      ...(discriminated.timeoutMs !== undefined ? {
        timeoutMs: discriminated.timeoutMs
      } : {}),
      classifyError: error => {
        if (error === CONTINUE_POLLING) {
          return 'retry';
        }
        return 'fatal';
      }
    };
  } else {
    wrappedStrategy = {
      ...pollingStrategy,
      timeoutMs: Number.MAX_SAFE_INTEGER,
      isRetryableError: error => error === CONTINUE_POLLING
    };
  }
  return retryTask({
    context: {
      logger
    },
    retryStrategy: wrappedStrategy,
    task: ({
      count,
      elapsed
    }) => {
      if (!shouldContinuePolling({
        count,
        elapsed
      })) {
        logger.info(`${logPrefix} Polling stopped (total polls: ${count})`);
        return Task.resolve(undefined);
      }
      logger.debug(`${logPrefix} Starting poll #${count + 1}`);
      const pollStartTime = Date.now();
      return task({
        count,
        elapsed
      }).andThen(value => {
        const pollDuration = Date.now() - pollStartTime;
        logger.debug(`${logPrefix} Poll #${count + 1} successful (elapsed: ${pollDuration}ms)`);
        onPollResult({
          count,
          elapsed,
          result: Result.ok(value)
        });
        return Task.reject(CONTINUE_POLLING);
      }).orElse(error => {
        if (error === CONTINUE_POLLING) {
          return Task.reject(CONTINUE_POLLING);
        }
        const pollDuration = Date.now() - pollStartTime;
        logger.debug(`${logPrefix} Poll #${count + 1} failed (elapsed: ${pollDuration}ms)`);
        onPollResult({
          count,
          elapsed,
          result: Result.err(error)
        });
        return Task.reject(CONTINUE_POLLING);
      });
    }
  });
}

export { pollingTask };
//# sourceMappingURL=polling-task.js.map
