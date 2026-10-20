/**
 * Consumer-supplied presenter factory.
 *
 * The package never knows concrete provider types. A consumer supplies a factory that maps its own providers and
 * stream identifiers to a presenter implementing DataStreamPresenterLike.
 */

import type { DataProviderLike } from '#src/chart/data-providers/_lib/data-provider-like';
import type { DataStreamIdentifier } from '#src/chart/data-providers/_lib/data-stream/types';
import type { DataStreamPresenterLike } from '#src/chart/data-stream-presenters/_lib/data-stream-presenter-like';

export type DataStreamPresenterFactory = Readonly<{
  makeDataStreamPresenter(input: {
    dataProvider: DataProviderLike;
    dataStreamIdentifier: DataStreamIdentifier;
  }): DataStreamPresenterLike;
}>;
