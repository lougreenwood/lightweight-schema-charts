import { createDataProviderUnknownStreamError, createDataProviderNoCursorForStreamError, createDataStreamHasNoDataError, createDataProviderNoNewDataError, createDataProviderInvalidTypeError, createDataProviderInvalidIdError } from '../errors.js';
import { Maybe } from 'true-myth';
import { err, ok } from 'true-myth/result';

/**
 * AbstractDataProvider
 *
 * Unified base for all providers.
 *
 * - Removes legacy registry-based typing/logic.
 * - Adopts getDataSource(context) as the canonical source for instance typing.
 * - Centralizes identity injection for every sample.
 * - Implements single-stream default with a per-instance stream id (overridable).
 *
 * Stream Id Policy:
 *
 * - Default: one per-instance stream id (UUID).
 * - Providers may override computeStreamIdentifiers() to supply domain-specific ids. For example:
 *
 *   - Market data provider: one UUID (accepted default)
 *   - Other providers: derive ids from the data source sample identity.
 *
 * The static-side type preserves the consumer's source and identity types.
 */
class AbstractDataProvider {
  /**
   * Concrete provider identity for this instance (derived from static's discoverIdentifiers).
   */
  identifier;

  /**
   * Human-readable name for this provider instance (the subclasses should set this, e.g., "MarketDataData").
   */

  /**
   * Public accessor for the data source (e.g., IndicatorGroupViewModel, MarketDataDataStreamModel).
   */
  get dataSource() {
    return this._dataSource;
  }

  /**
   * Public API: resolve the provider's data stream identifiers.
   *
   * - Exposes the static's dataStreamIdentifiers.
   * - Subclasses with dynamic identifiers may override this getter.
   */
  get dataStreamIdentifiers() {
    return this.staticSide.dataStreamIdentifiers;
  }

  /**
   * Default layout for this provider's streams. One pane per stream, each with an empty series array.
   *
   * The schema fills in series detail (field paths, visibility) from presenters during assembly. Multi-stream providers
   * (e.g., MarketDataData) override to group related streams into shared panes.
   */
  get defaultLayout() {
    return {
      panes: this.dataStreamIdentifiers.values().map(dataStreamIdentifier => ({
        seriesGroups: [{
          groupId: `${this.stableLayoutKey}::${dataStreamIdentifier.type}`,
          series: [],
          stableLayoutKey: this.stableLayoutKey,
          streamType: dataStreamIdentifier.type
        }]
      })).toArray()
    };
  }
  getDataState({
    dataStreamIdentifier
  }) {
    const cursor = this.getCursor({
      dataStreamIdentifier
    }).unwrapOr(undefined);
    return {
      cursor,
      dataHash: undefined,
      dataLength: undefined,
      projectionId: undefined
    };
  }
  groupIdFor({
    dataStreamIdentifier
  }) {
    return `${this.stableLayoutKey}::${dataStreamIdentifier.type}`;
  }

  /**
   * Stable identity key for layout persistence. Defaults to identifier.id, which is the domain entity ID (e.g., trade
   * position set ID, indicator template provider ID).
   */
  get stableLayoutKey() {
    return this.identifier.id;
  }
  constructor({
    dataSource,
    identifier
  }) {
    // dataSource is passed from create() after getDataSource() succeeds
    // This avoids calling getDataSource in constructor and handles Result properly
    this._dataSource = dataSource;
    this.identifier = identifier;
  }

  /**
   * Returns the provider-maintained cursor for the given stream, if available.
   */
  getCursor({
    dataStreamIdentifier: {
      id: idForCursor
    }
  }) {
    const known = this.dataStreamIdentifiers.values().some(s => s.id === idForCursor);
    if (!known) {
      return err(createDataProviderUnknownStreamError({
        streamId: idForCursor
      }));
    }
    const cursor = this.#cursorByStreamId.get(idForCursor);
    return cursor ? ok(cursor) : err(createDataProviderNoCursorForStreamError({
      streamId: idForCursor
    }));
  }

  /**
   * Returns updates for the given stream since the provided cursor.
   *
   * - Providers must NEVER return empty update sets: Err(DataProviderNoNewDataError) instead.
   * - When 'cursor' is omitted, providers may use internal cursors or perform initial backfill.
   * - Identity fields (dataProviderId/Type/StreamId) are injected automatically.
   */
  getDataSince({
    cursor,
    dataStreamIdentifier
  }) {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      // Translate cursor to time for cursor-agnostic data retrieval
      const sinceDate = cursor ? new Date(cursor.time) : undefined;
      const raw = new Set(this._dataSampleSourceRecordsSince({
        dataStreamIdentifier,
        sinceDate
      })).values();

      // Map raw records to canonical samples and inject identity using shared helper.
      const data = raw.reduce((acc, dataSampleSource) => {
        const sample = this._makeSampleFromSource({
          dataSampleSource,
          dataStreamIdentifier
        });
        return acc.add(sample);
      }, new Set());
      return this.#finalizeBatch({
        data,
        dataStreamIdentifier
      });
    });
  }

  /**
   * Return an example (latest) sample for a specific stream without advancing the internal cursor.
   */
  getExampleDataSampleForStream({
    dataStreamIdentifier
  }) {
    return this.#validateStreamIdentifier(dataStreamIdentifier).andThen(() => {
      const raw = new Set(this._dataSampleSourceRecordsSince({
        dataStreamIdentifier
      })).values();
      const lastDataSampleSource = raw.toArray().at(-1);
      if (!lastDataSampleSource) {
        return err(createDataStreamHasNoDataError({
          streamId: dataStreamIdentifier.id
        }));
      }
      const sample = this._makeSampleFromSource({
        dataSampleSource: lastDataSampleSource,
        dataStreamIdentifier
      });
      return ok(sample);
    });
  }

  /**
   * Return example (latest) samples for all known streams without advancing cursors. Streams with no data are omitted.
   */
  getExampleDataSampleForStreams() {
    const examples = new Map();
    this.dataStreamIdentifiers.forEach(stream => {
      const res = this.getExampleDataSampleForStream({
        dataStreamIdentifier: stream
      });
      res.match({
        Ok: v => examples.set(stream.id, v),
        Err: () => {}
      });
    });
    return examples;
  }

  /**
   * Provider-specific data source (e.g., Set<Tick>).
   */
  _dataSource;

  /**
   * Access the subclass static members in a type-safe manner.
   */

  /**
   * Optional helper for subclasses to clear internal cursor state.
   */
  clearInternalCursor(args) {
    this.#cursorByStreamId.delete(args.streamId);
  }

  /**
   * Subclasses must adapt a raw record from the data source into the canonical non-identity portion of a
   * ChartDataSample. The base will inject identity fields automatically.
   */

  /**
   * Subclasses must provide an iterable over source records since an optional date.
   */

  /**
   * Create a canonical BaseChartDataSample from a provider's raw data source record. Identity fields are injected here.
   */
  _makeSampleFromSource({
    dataSampleSource,
    dataStreamIdentifier
  }) {
    const core = this._dataSampleSourceAdapter({
      dataSampleSource,
      dataStreamIdentifier
    });
    return {
      data: core.data,
      dataProviderIdentifier: this.identifier,
      dataStreamIdentifier,
      meta: core.meta,
      time: core.time,
      window: core.window
    };
  }

  /**
   * Optional helper for subclasses to set internal cursor state.
   */
  setInternalCursor(args) {
    this.#cursorByStreamId.set(args.streamId, args.cursor);
  }

  // Internal per-stream cursor store
  #cursorByStreamId = new Map();

  // Internal helpers
  #finalizeBatch({
    data,
    dataStreamIdentifier
  }) {
    if (data.size === 0) {
      return err(createDataProviderNoNewDataError({
        streamId: dataStreamIdentifier.id
      }));
    }
    const latestSample = data.values().reduce((currentLatest, sample) => {
      if (currentLatest === undefined) {
        return sample;
      }
      return sample.time.getTime() > currentLatest.time.getTime() ? sample : currentLatest;
    }, undefined);
    if (latestSample === undefined) {
      return err(createDataProviderNoNewDataError({
        streamId: dataStreamIdentifier.id
      }));
    }
    const newCursor = {
      time: latestSample.time.getTime()
    };
    this.#cursorByStreamId.set(dataStreamIdentifier.id, newCursor);
    const updates = new Set(data.values().map(sample => ({
      data: sample,
      kind: 'append'
    })));
    return ok({
      dataStreamIdentifier,
      newCursor,
      updates
    });
  }
  #validateStreamIdentifier(dataStreamIdentifier) {
    const {
      id
    } = dataStreamIdentifier;
    const known = this.dataStreamIdentifiers.values().some(s => s.id === id);
    return known ? ok(dataStreamIdentifier) : err(createDataProviderUnknownStreamError({
      streamId: id
    }));
  }
}

/**
 * Validates a data provider identifier against discovered identifiers.
 *
 * This shared utility ensures consistent validation logic across all data providers. It checks if the provided
 * identifier matches any discovered identifier and returns appropriate errors if validation fails.
 *
 * @param   identifier            - The identifier to validate
 * @param   discoveredIdentifiers - Set of valid identifiers from discoverIdentifiers()
 *
 * @returns                       Result indicating validation success or specific error (type or id mismatch)
 */
function validateDataProviderIdentifier({
  identifier,
  validIdentifiers
}) {
  // Check if the provided identifier matches any discovered identifier
  const isValid = Maybe.of(validIdentifiers.values().some(discovered => discovered.type === identifier.type && discovered.id === identifier.id));
  return isValid.match({
    Just: () => {
      return ok(true);
    },
    Nothing: () => {
      // Determine which field is invalid for a helpful error message
      const hasMatchingType = validIdentifiers.values().some(discovered => discovered.type === identifier.type);
      if (!hasMatchingType) {
        // Extract expected type(s) from discovered identifiers
        const expectedTypes = [...validIdentifiers.values()].map(d => d.type);
        const expectedType = expectedTypes[0] ?? 'unknown';
        return err(createDataProviderInvalidTypeError({
          expected: expectedType,
          received: identifier.type
        }));
      }

      // If type matches but id doesn't, it's an invalid id
      const expectedIds = [...validIdentifiers.values()].map(d => d.id);
      const expectedId = expectedIds[0] ?? 'unknown';
      return err(createDataProviderInvalidIdError({
        expected: expectedId,
        received: identifier.id
      }));
    }
  });
}

export { AbstractDataProvider, validateDataProviderIdentifier };
//# sourceMappingURL=abstract-data-provider.js.map
