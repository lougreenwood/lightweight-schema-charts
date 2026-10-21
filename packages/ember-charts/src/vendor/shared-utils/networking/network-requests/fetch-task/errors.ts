import type { HttpError } from '../../http-errors/error-types';
import type { AbortedError } from '../../../errors/aborted-error';
import type { AppLogger } from '../../../logger/logger';

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
