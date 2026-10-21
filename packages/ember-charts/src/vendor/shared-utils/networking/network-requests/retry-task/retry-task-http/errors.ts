import type {
  Http5xxServerError,
  Http429RateLimitedError,
  HttpNetworkUnavailableError,
} from '../../../http-errors/error-types';

export type RetryableHttpError =
  Http5xxServerError | Http429RateLimitedError | HttpNetworkUnavailableError;
