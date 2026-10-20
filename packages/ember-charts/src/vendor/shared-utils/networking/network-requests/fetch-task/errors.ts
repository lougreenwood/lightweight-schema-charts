import type { HttpError } from '#src/vendor/shared-utils/networking/http-errors/error-types';
import type { AbortedError } from '#src/vendor/shared-utils/errors/aborted-error';
import type { AppLogger } from '#src/vendor/shared-utils/logger/logger';

export type AbortableHttpError = HttpError | HttpFetchAbortedError;

export type HttpFetchAbortedError = AbortedError<{
  errorCode: 'HTTP_FETCH_ABORTED';
  logger: AppLogger;
  message: string;
  meta: {
    reason: string;
    url: string;
  };
}>;
