import type { HasLogger } from '../../logger/types';
import type {
  HttpError,
  HttpMethod,
  HttpStatus4xx,
  HttpStatus5xx,
} from '../http-errors/error-types';
import type { AbortableHttpError } from './fetch-task/errors';
import type { FetchTaskOptions } from './fetch-task/types';
import { isAppError } from '../../errors/is-app-error';

import { AbortedError } from '../../errors/aborted-error';
import {
  http4xxClientError,
  http5xxServerError,
  http401UnauthorizedError,
  http403ForbiddenError,
  http404NotFoundError,
  http429RateLimitedError,
  httpNetworkUnavailableError,
  httpResponseParseFailedError,
  httpUnknownError,
} from '../http-errors/http-errors';
import { safelyTryOrElse, Task } from 'true-myth/task';

type FetchInput = string | URL | Request;

// Overload: init provided
export function fetchTask<T>(
  input: FetchInput,
  init: RequestInit,
  options: FetchTaskOptions,
): Task<T, AbortableHttpError>;

// Overload: init omitted
export function fetchTask<T>(
  input: FetchInput,
  options: FetchTaskOptions,
): Task<T, AbortableHttpError>;

// Implementation
export function fetchTask<T>(
  input: FetchInput,
  initOrOptions?: FetchTaskOptions | RequestInit,
  maybeOptions?: FetchTaskOptions,
): Task<T, AbortableHttpError> {
  const { init, method, options, url } = parseFetchTaskArgs({
    ...(initOrOptions !== undefined ? { init: initOrOptions } : {}),
    input,
    ...(maybeOptions !== undefined ? { maybeOptions } : {}),
  });
  const { context, signal, upstream = 'fetch' } = options;

  // Single fetch operation.
  // For retry logic, wrap this function with retryTask at the call site.
  const errorMapper = (reason: unknown): AbortableHttpError =>
    mapUnknownErrorToAbortableHttpError({
      context,
      reason,
      meta: {
        method,
        upstream,
        url,
      },
    });

  return safelyTryOrElse<T, AbortableHttpError>(errorMapper, () =>
    executeFetchAndParse<T>({
      context,
      ...(init !== undefined ? { init } : {}),
      input,
      ...(signal !== undefined ? { signal } : {}),
      meta: {
        method,
        upstream,
        url,
      },
    }),
  );
}

function createHttpErrorFromStatus({
  context,
  meta: { method, responseBody, status, statusText, upstream, url },
  response,
}: {
  context: HasLogger;
  meta: {
    method: HttpMethod;
    responseBody?: unknown;
    status: number;
    statusText: string;
    upstream: string;
    url: string;
  };
  response: Response;
}): HttpError {
  switch (status) {
    case 401:
      return http401UnauthorizedError({
        context,
        message: `Unauthorized: ${statusText}`,
        meta: { method, upstream, url },
      });

    case 403:
      return http403ForbiddenError({
        context,
        message: `Forbidden: ${statusText}`,
        meta: { method, upstream, url },
      });

    case 404:
      return http404NotFoundError({
        context,
        message: `Not found: ${statusText}`,
        meta: { method, upstream, url },
      });

    case 429: {
      const retryAfterMs = parseRetryAfterHeader({
        retryAfterValue: response.headers.get('Retry-After'),
      });
      return http429RateLimitedError({
        context,
        message: `Rate limited: ${statusText}`,
        meta: { method, retryAfterMs, upstream, url },
      });
    }

    default:
      switch (true) {
        case status >= 500:
          return http5xxServerError({
            context,
            message: `Server error: ${statusText}`,
            meta: {
              method,
              responseBody,
              status: status as HttpStatus5xx,
              statusText,
              upstream,
              url,
            },
          });

        case status >= 400:
          return http4xxClientError({
            context,
            message: `Client error: ${statusText}`,
            meta: {
              method,
              responseBody,
              status: status as HttpStatus4xx,
              statusText,
              upstream,
              url,
            },
          });

        default:
          return httpUnknownError({
            context,
            message: `HTTP error: ${statusText}`,
            meta: { method, upstream, url },
          });
      }
  }
}

async function executeFetchAndParse<T>({
  context,
  init,
  input,
  meta,
  signal,
}: {
  context: HasLogger;
  init?: RequestInit;
  input: FetchInput;
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
  signal?: AbortSignal;
}): Promise<T> {
  const validateStatus = (status: number): boolean =>
    status >= 200 && status < 300;

  const fetchInit = signal ? { ...init, signal } : init;
  const response = await fetch(input, fetchInit);

  if (!validateStatus(response.status)) {
    const responseBody = await tryReadResponseBody({ response });

    const httpError = createHttpErrorFromStatus({
      context,
      response,
      meta: {
        ...meta,
        responseBody,
        status: response.status,
        statusText: response.statusText,
      },
    });

    throw httpError;
  }

  return (await response.json()) as Promise<T>;
}

function mapUnknownErrorToAbortableHttpError({
  context,
  meta: { url },
  meta,
  reason,
}: {
  context: HasLogger;
  meta: {
    method: HttpMethod;
    upstream: string;
    url: string;
  };
  reason: unknown;
}): AbortableHttpError {
  switch (true) {
    case reason instanceof DOMException && reason.name === 'AbortError':
      return AbortedError.of({
        context,
        errorCode: 'HTTP_FETCH_ABORTED',
        message: 'Fetch request aborted by signal',
        meta: {
          reason: 'signal',
          url,
        },
      });

    case isAppError(reason):
      return reason as AbortableHttpError;

    case reason instanceof TypeError:
      return httpNetworkUnavailableError({
        context,
        message: `Network error: ${reason.message}`,
        meta: {
          ...meta,
          cause: reason.message,
        },
      });

    case reason instanceof SyntaxError:
      return httpResponseParseFailedError({
        context,
        message: `Failed to parse response: ${reason.message}`,
        meta,
      });

    case reason instanceof Error:
      return httpNetworkUnavailableError({
        context,
        message: `Fetch error: ${reason.message}`,
        meta: {
          ...meta,
          cause: reason.message,
        },
      });

    default:
      return httpUnknownError({
        context,
        message: 'Unknown fetch error',
        meta,
      });
  }
}

function parseFetchTaskArgs({
  init: initOrOptions,
  input,
  maybeOptions,
}: {
  init?: FetchTaskOptions | RequestInit;
  input: FetchInput;
  maybeOptions?: FetchTaskOptions;
}): {
  init: RequestInit | undefined;
  method: HttpMethod;
  options: FetchTaskOptions;
  url: string;
} {
  const init: RequestInit | undefined =
    maybeOptions !== undefined ? (initOrOptions as RequestInit) : undefined;
  const options: FetchTaskOptions =
    maybeOptions !== undefined
      ? maybeOptions
      : (initOrOptions as FetchTaskOptions);
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = (init?.method ?? 'GET') as HttpMethod;

  return { init, method, options, url };
}

function parseRetryAfterHeader({
  retryAfterValue,
}: {
  retryAfterValue: null | string;
}): number {
  if (!retryAfterValue) {
    return 0;
  }

  const seconds = Number(retryAfterValue);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const date = new Date(retryAfterValue);
  if (!Number.isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return delayMs > 0 ? delayMs : 0;
  }

  return 0;
}

async function tryReadResponseBody({
  response,
}: {
  response: Response;
}): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return undefined;
    }
  }
}
