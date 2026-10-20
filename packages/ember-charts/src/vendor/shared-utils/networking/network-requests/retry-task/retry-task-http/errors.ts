import type {
  Http5xxServerError,
  Http429RateLimitedError,
  HttpNetworkUnavailableError,
} from '#src/vendor/shared-utils/networking/http-errors/error-types';

export type RetryableHttpError =
  Http5xxServerError | Http429RateLimitedError | HttpNetworkUnavailableError;
