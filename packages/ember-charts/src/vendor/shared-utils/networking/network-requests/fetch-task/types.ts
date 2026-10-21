import type { HasLogger } from '../../../logger/types';

export type FetchTaskContext = HasLogger;

export type FetchTaskOptions = {
  context: FetchTaskContext;
  signal?: AbortSignal | undefined;
  upstream?: string;
};
