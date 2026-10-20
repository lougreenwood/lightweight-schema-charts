import type { PollingTaskOptions } from '#src/vendor/shared-utils/networking/network-requests/polling-task/types';
import type {
  DiscriminatedRetryStrategy,
  RetryTaskOptions,
} from '#src/vendor/shared-utils/networking/network-requests/retry-task/types';

import { retryTask } from '#src/vendor/shared-utils/networking/network-requests/retry-task';
import { Result, Task } from 'true-myth';

const CONTINUE_POLLING = Symbol('CONTINUE_POLLING');
type ContinuePolling = typeof CONTINUE_POLLING;

export function pollingTask<T, E>({
  context: { logger },
  onPollResult,
  pollId,
  pollingStrategy,
  shouldContinuePolling,
  task,
}: PollingTaskOptions<T, E>): Task<never, ContinuePolling> {
  const logPrefix = `[pollingTask:${pollId}]`;

  logger.info(`${logPrefix} Starting polling`);

  let wrappedStrategy: RetryTaskOptions<
    never,
    ContinuePolling
  >['retryStrategy'];

  if ('classifyError' in pollingStrategy) {
    const discriminated =
      pollingStrategy as DiscriminatedRetryStrategy<unknown> & {
        timeoutMs?: number;
      };
    wrappedStrategy = {
      rateLimitStrategy: discriminated.rateLimitStrategy,
      retryStrategy: discriminated.retryStrategy,
      ...(discriminated.timeoutMs !== undefined
        ? { timeoutMs: discriminated.timeoutMs }
        : {}),
      classifyError: (error: ContinuePolling) => {
        if (error === CONTINUE_POLLING) {
          return 'retry' as const;
        }
        return 'fatal' as const;
      },
    };
  } else {
    wrappedStrategy = {
      ...pollingStrategy,
      timeoutMs: Number.MAX_SAFE_INTEGER,
      isRetryableError: (error: ContinuePolling) => error === CONTINUE_POLLING,
    };
  }

  return retryTask<never, ContinuePolling>({
    context: { logger },
    retryStrategy: wrappedStrategy,
    task: ({ count, elapsed }) => {
      if (!shouldContinuePolling({ count, elapsed })) {
        logger.info(`${logPrefix} Polling stopped (total polls: ${count})`);
        return Task.resolve(undefined as never);
      }

      logger.debug(`${logPrefix} Starting poll #${count + 1}`);
      const pollStartTime = Date.now();

      return task({ count, elapsed })
        .andThen((value: T) => {
          const pollDuration = Date.now() - pollStartTime;
          logger.debug(
            `${logPrefix} Poll #${count + 1} successful (elapsed: ${pollDuration}ms)`,
          );
          onPollResult({ count, elapsed, result: Result.ok(value) });
          return Task.reject(CONTINUE_POLLING);
        })
        .orElse((error: ContinuePolling | E) => {
          if (error === CONTINUE_POLLING) {
            return Task.reject(CONTINUE_POLLING);
          }

          const pollDuration = Date.now() - pollStartTime;
          logger.debug(
            `${logPrefix} Poll #${count + 1} failed (elapsed: ${pollDuration}ms)`,
          );
          onPollResult({ count, elapsed, result: Result.err(error) });
          return Task.reject(CONTINUE_POLLING);
        });
    },
  });
}
