import type { HasLogger } from '#src/vendor/shared-utils/logger/types';

export type FetchTaskContext = HasLogger;

export type FetchTaskOptions = {
  context: FetchTaskContext;
  signal?: AbortSignal | undefined;
  upstream?: string;
};
