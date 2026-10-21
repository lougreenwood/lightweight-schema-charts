/**
 * Consumer-supplied presenter factory.
 *
 * The package never knows concrete provider types. A consumer supplies a factory that maps its own providers and
 * stream identifiers to a presenter implementing DataStreamPresenterLike.
 */

import type { DataProviderLike } from '../../../data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '../../../data-providers/_lib/data-stream/types';
import type { DataStreamPresenterLike } from '../data-stream-presenter-like';

export type DataStreamPresenterFactory = Readonly<{
  makeDataStreamPresenter(input: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): DataStreamPresenterLike;
}>;
