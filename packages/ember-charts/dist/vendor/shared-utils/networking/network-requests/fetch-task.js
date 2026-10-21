import { isAppError } from '../../errors/is-app-error.js';
import { AbortedError } from '../../errors/aborted-error.js';
import { httpUnknownError, httpNetworkUnavailableError, httpResponseParseFailedError, http4xxClientError, http5xxServerError, http429RateLimitedError, http404NotFoundError, http403ForbiddenError, http401UnauthorizedError } from '../http-errors/http-errors.js';
import { safelyTryOrElse } from 'true-myth/task';

// Overload: init provided

// Overload: init omitted

// Implementation
function fetchTask(input, initOrOptions, maybeOptions) {
  const {
    init,
    method,
    options,
    url
  } = parseFetchTaskArgs({
    ...(initOrOptions !== undefined ? {
      init: initOrOptions
    } : {}),
    input,
    ...(maybeOptions !== undefined ? {
      maybeOptions
    } : {})
  });
  const {
    context,
    signal,
    upstream = 'fetch'
  } = options;

  // Single fetch operation.
  // For retry logic, wrap this function with retryTask at the call site.
  const errorMapper = reason => mapUnknownErrorToAbortableHttpError({
    context,
    reason,
    meta: {
      method,
      upstream,
      url
    }
  });
  return safelyTryOrElse(errorMapper, () => executeFetchAndParse({
    context,
    ...(init !== undefined ? {
      init
    } : {}),
    input,
    ...(signal !== undefined ? {
      signal
    } : {}),
    meta: {
      method,
      upstream,
      url
    }
  }));
}
function createHttpErrorFromStatus({
  context,
  meta: {
    method,
    responseBody,
    status,
    statusText,
    upstream,
    url
  },
  response
}) {
  switch (status) {
    case 401:
      return http401UnauthorizedError({
        context,
        message: `Unauthorized: ${statusText}`,
        meta: {
          method,
          upstream,
          url
        }
      });
    case 403:
      return http403ForbiddenError({
        context,
        message: `Forbidden: ${statusText}`,
        meta: {
          method,
          upstream,
          url
        }
      });
    case 404:
      return http404NotFoundError({
        context,
        message: `Not found: ${statusText}`,
        meta: {
          method,
          upstream,
          url
        }
      });
    case 429:
      {
        const retryAfterMs = parseRetryAfterHeader({
          retryAfterValue: response.headers.get('Retry-After')
        });
        return http429RateLimitedError({
          context,
          message: `Rate limited: ${statusText}`,
          meta: {
            method,
            retryAfterMs,
            upstream,
            url
          }
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
              status: status,
              statusText,
              upstream,
              url
            }
          });
        case status >= 400:
          return http4xxClientError({
            context,
            message: `Client error: ${statusText}`,
            meta: {
              method,
              responseBody,
              status: status,
              statusText,
              upstream,
              url
            }
          });
        default:
          return httpUnknownError({
            context,
            message: `HTTP error: ${statusText}`,
            meta: {
              method,
              upstream,
              url
            }
          });
      }
  }
}
async function executeFetchAndParse({
  context,
  init,
  input,
  meta,
  signal
}) {
  const validateStatus = status => status >= 200 && status < 300;
  const fetchInit = signal ? {
    ...init,
    signal
  } : init;
  const response = await fetch(input, fetchInit);
  if (!validateStatus(response.status)) {
    const responseBody = await tryReadResponseBody({
      response
    });
    const httpError = createHttpErrorFromStatus({
      context,
      response,
      meta: {
        ...meta,
        responseBody,
        status: response.status,
        statusText: response.statusText
      }
    });
    throw httpError;
  }
  return await response.json();
}
function mapUnknownErrorToAbortableHttpError({
  context,
  meta: {
    url
  },
  meta,
  reason
}) {
  switch (true) {
    case reason instanceof DOMException && reason.name === 'AbortError':
      return AbortedError.of({
        context,
        errorCode: 'HTTP_FETCH_ABORTED',
        message: 'Fetch request aborted by signal',
        meta: {
          reason: 'signal',
          url
        }
      });
    case isAppError(reason):
      return reason;
    case reason instanceof TypeError:
      return httpNetworkUnavailableError({
        context,
        message: `Network error: ${reason.message}`,
        meta: {
          ...meta,
          cause: reason.message
        }
      });
    case reason instanceof SyntaxError:
      return httpResponseParseFailedError({
        context,
        message: `Failed to parse response: ${reason.message}`,
        meta
      });
    case reason instanceof Error:
      return httpNetworkUnavailableError({
        context,
        message: `Fetch error: ${reason.message}`,
        meta: {
          ...meta,
          cause: reason.message
        }
      });
    default:
      return httpUnknownError({
        context,
        message: 'Unknown fetch error',
        meta
      });
  }
}
function parseFetchTaskArgs({
  init: initOrOptions,
  input,
  maybeOptions
}) {
  const init = maybeOptions !== undefined ? initOrOptions : undefined;
  const options = maybeOptions !== undefined ? maybeOptions : initOrOptions;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method ?? 'GET';
  return {
    init,
    method,
    options,
    url
  };
}
function parseRetryAfterHeader({
  retryAfterValue
}) {
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
  response
}) {
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

export { fetchTask };
//# sourceMappingURL=fetch-task.js.map
