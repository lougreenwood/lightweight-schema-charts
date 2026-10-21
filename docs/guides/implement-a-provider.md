# Implement a provider

A provider is the package's only source of data. One provider can expose several streams.

## Required surface

| Member                           | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `identifier`                     | Provider identity: `{ id, type }`               |
| `name`                           | Human-readable provider name                    |
| `stableLayoutKey`                | Stable key used in default group identity       |
| `dataStreamIdentifiers`          | The streams this provider exposes               |
| `defaultLayout`                  | Where those streams should appear               |
| `getCursor`                      | Latest consumed point for a stream, or an error |
| `getDataSince`                   | Incremental fetch after a cursor                |
| `getDataState`                   | Four plain values used for change detection     |
| `groupIdFor`                     | Stable identity for a stream's group            |
| `dataSource`                     | The consumer's own underlying data source       |
| `getExampleDataSampleForStream`  | An example sample without advancing a cursor    |
| `getExampleDataSampleForStreams` | Example samples indexed by stream id            |

The exported `AbstractDataProvider<TDataProviderStatic, TContext extends object>` implements the shared fetch/cursor behavior. A subclass explicitly supplies its static-side type and its factory-context type, and its protected `staticSide` reference; the package does not cast `this.constructor` into a consumer type. `DataProviderStatic<TDataSource, TCreateError, TContext>` keeps the factory context consumer-owned. All generic arguments are required. The complete example is `test-app/app/synthetic/synthetic-provider.ts`.

## Fetching

`getDataSince` returns a result holding a batch:

```ts
{
  dataStreamIdentifier,
  newCursor: { time: 1700000060000 },
  updates: new Set([
    { kind: 'append', data: sample },
    { kind: 'replace-latest', data: mutatedSample },
  ]),
}
```

Two rules matter:

- A provider must not return an empty batch. If there is nothing new, return an error instead, so the caller can distinguish "no data" from "no change".
- `append` adds a point; `replace-latest` mutates the most recent one. Use the latter when a value is still forming, such as the current candle.

## Data state

```ts
getDataState({ dataStreamIdentifier }) {
  return {
    cursor: { time: 1700000060000 },
    dataHash: 'candle-1700000060000',
    dataLength: 120,
    projectionId: undefined,
  };
}
```

Each value is optional, and absence is meaningful:

- No `cursor` means nothing has been consumed; the first fetch is a backfill.
- No `dataHash` means content-only updates cannot be detected, so a mutated latest value needs another signal.
- No `dataLength` means the empty-to-populated rebuild cannot be detected from sample count alone.
- No `projectionId` means the stream cannot be reconfigured, so projection changes never trigger a rebuild.

Supply what you can. Supplying a value you cannot keep accurate is worse than omitting it.

## Identity

```ts
groupIdFor({ dataStreamIdentifier }) {
  return `${this.stableLayoutKey}::${dataStreamIdentifier.type}`;
}
```

Return the same value for the same logical series across reconfigurations and remounts. If the value changes, the chart treats it as a different series and rebuilds rather than updating.

A stream whose configuration can change identity — for example, a different transform producing different values — should return a new identity for the new configuration.

## Default layout

```ts
get defaultLayout() {
  return {
    panes: [
      {
        seriesGroups: [
          {
            groupId: 'synthetic::candlestick',
            series: [],
            stableLayoutKey: 'synthetic',
            streamType: 'candlestick',
          },
        ],
      },
    ],
  };
}
```

Leave `series` empty. The schema fills it from the presenter, so a fragment only states where a stream belongs. A provider with several related streams can place them in one pane; the default is one pane per stream.

## Checklist

- [ ] Each stream identifier is unique within the provider.
- [ ] `getDataSince` never returns an empty batch.
- [ ] `getDataState` values match what fetching actually does.
- [ ] `groupIdFor` is stable across reconfigurations that should reuse the series.
- [ ] `defaultLayout` covers every stream you expose.
