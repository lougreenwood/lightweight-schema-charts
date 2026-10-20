import type { HasLogger } from '#src/vendor/shared-utils/logger/types';
import type { RetryTaskOptions } from '#src/vendor/shared-utils/networking/network-requests/retry-task/types';
import type { Strategy } from 'true-myth/task/delay';

import { duration } from '#src/vendor/shared-utils/duration';
import {
  isRetryFailed,
  type RetryFailed,
  stopRetrying,
  type StopRetrying,
  Task,
  withRetries,
} from 'true-myth/task';

const DEFAULT_RETRY_MAX_DURATION_MS = duration('5s');

export function retryTask<T, E>({
  context,
  retryStrategy,
  task,
}: RetryTaskOptions<T, E>): Task<T, E> {
  const { logger } = context;

  if ('classifyError' in retryStrategy) {
    const {
      classifyError,
      rateLimitStrategy,
      retryStrategy: normalRetryStrategy,
      timeoutMs = DEFAULT_RETRY_MAX_DURATION_MS,
    } = retryStrategy;

    const state: { lastClassification: 'rate-limit' | 'retry' | undefined } = {
      lastClassification: undefined,
    };
    const normalStrategyInstance = normalRetryStrategy.strategyFactory(
      normalRetryStrategy.options,
    );
    const rateLimitStrategyInstance = rateLimitStrategy.strategyFactory(
      rateLimitStrategy.options,
    );

    const compositeStrategy = createDiscriminatedStrategy({
      normalStrategy: normalStrategyInstance,
      rateLimitStrategy: rateLimitStrategyInstance,
      state,
    });

    const isRetryableError = (error: E): boolean => {
      const classification = classifyError(error);

      if (classification === 'fatal') {
        return false;
      }

      state.lastClassification = classification;

      if (classification === 'rate-limit') {
        logger.warn(
          '[retryTask] Rate limit detected, using rate-limit backoff strategy',
        );
      }

      return true;
    };

    const retryTaskInstance = withRetries(({ count, elapsed }) => {
      return executeWithRetryLogic({
        context: { logger },
        count,
        elapsed,
        isRetryableError,
        retryTimeoutMs: timeoutMs,
        task,
      });
    }, compositeStrategy);

    return retryTaskInstance.orElse(
      (rejection: E | RetryFailed<E | StopRetrying> | StopRetrying) =>
        unwrapRetryRejection({
          context: { logger },
          isRetryableError,
          rejection,
        }),
    );
  }

  const {
    isRetryableError,
    options,
    strategyFactory,
    timeoutMs = DEFAULT_RETRY_MAX_DURATION_MS,
  } = retryStrategy;
  const strategy = strategyFactory(options);

  const retryTaskInstance = withRetries(({ count, elapsed }) => {
    return executeWithRetryLogic({
      context: { logger },
      count,
      elapsed,
      isRetryableError,
      retryTimeoutMs: timeoutMs,
      task,
    });
  }, strategy);

  return retryTaskInstance.orElse(
    (rejection: E | RetryFailed<E | StopRetrying> | StopRetrying) =>
      unwrapRetryRejection({
        context: { logger },
        isRetryableError,
        rejection,
      }),
  );
}

function* createDiscriminatedStrategy({
  normalStrategy,
  rateLimitStrategy,
  state,
}: {
  normalStrategy: Strategy;
  rateLimitStrategy: Strategy;
  state: { lastClassification: 'rate-limit' | 'retry' | undefined };
}): Strategy {
  while (true) {
    const activeStrategy =
      state.lastClassification === 'rate-limit'
        ? rateLimitStrategy
        : normalStrategy;
    const next = activeStrategy.next();

    if (next.done) {
      return;
    }

    yield next.value;
  }
}

function executeWithRetryLogic<T, E>({
  context: { logger },
  count,
  elapsed,
  isRetryableError,
  retryTimeoutMs,
  task,
}: {
  context: HasLogger;
  count: number;
  elapsed: number;
  retryTimeoutMs: number;
  isRetryableError: (error: E) => boolean;
  task: (args: { count: number; elapsed: number }) => Task<T, E>;
}): Task<T, E | StopRetrying> {
  if (elapsed >= retryTimeoutMs) {
    logger.warn(
      `[retryTask] Retry timeout exceeded (${elapsed}ms) after ${count} attempts.`,
    );
    return Task.reject(stopRetrying(`Retry timeout exceeded (${elapsed}ms)`));
  }

  return task({ count, elapsed }).orElse((error: E) => {
    if (isRetryableError(error)) {
      logger.warn(
        `[retryTask] Retryable error encountered (Attempt ${count + 1}), scheduling retry.`,
      );
      return Task.reject(error);
    }

    logger.error(
      `[retryTask] Non-retryable error encountered (Attempt ${count + 1}), stopping retries.`,
    );
    return Task.reject(stopRetrying('Non-retryable error encountered', error));
  });
}

function unwrapRetryRejection<E>({
  context: { logger },
  isRetryableError,
  rejection,
}: {
  context: HasLogger;
  rejection: E | RetryFailed<E | StopRetrying> | StopRetrying;
  isRetryableError: (error: E) => boolean;
}): Task<never, E> {
  let finalError: E;

  if (isRetryFailed(rejection)) {
    logger.warn(
      `[retryTask] Retries failed after ${rejection.tries} attempts over ${rejection.totalDuration}ms.`,
    );

    const lastActualError = rejection.rejections
      .slice()
      .reverse()
      .find(
        (e): e is E =>
          !(e instanceof Error && e.name === 'TrueMyth.Task.StopRetrying'),
      );

    if (lastActualError) {
      finalError = lastActualError;
    } else {
      const causeMessage =
        rejection.cause &&
        typeof rejection.cause === 'object' &&
        'message' in rejection.cause
          ? String(rejection.cause.message)
          : 'Unknown';
      const message = `Retries failed but no specific error identified. Cause: ${causeMessage}`;
      finalError = new Error(message, {
        cause: rejection.cause instanceof Error ? rejection.cause : undefined,
      }) as E;
      logger.error(
        '[retryTask] Could not identify last specific error during RetryFailed mapping.',
      );
    }

    if (
      rejection.cause instanceof Error &&
      rejection.cause.name === 'TrueMyth.Task.StopRetrying' &&
      rejection.cause.message.includes('timeout exceeded')
    ) {
      logger.warn(`[retryTask] Failure cause: Timeout.`);
    }
  } else if (
    rejection instanceof Error &&
    rejection.name === 'TrueMyth.Task.StopRetrying'
  ) {
    const cause = rejection.cause;
    if (cause instanceof Error && isRetryableError(cause as E) === false) {
      finalError = cause as E;
    } else {
      const message = `Stopped retrying: ${rejection.message}. Cause: ${cause instanceof Error ? cause.message : 'Unknown'}`;
      finalError = new Error(message, {
        cause: cause instanceof Error ? cause : undefined,
      }) as E;
      logger.warn(
        '[retryTask] Could not identify specific non-retryable error during StopRetrying mapping.',
      );
    }
    logger.warn(`[retryTask] Stopped retrying explicitly.`);
  } else {
    finalError = rejection as E;
  }

  return Task.reject(finalError);
}
