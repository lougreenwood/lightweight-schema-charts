# Implement a presenter

A presenter describes one stream: how it is named, which series fields it exposes, and how a raw sample becomes a series point. It never fetches.

## Required surface

| Member | Purpose |
| --- | --- |
| `dataProvider` | The provider this stream belongs to |
| `dataStreamIdentifier` | The stream being described |
| `streamName` | Display name for the series |
| `providerName` | Display name for the provider |
| `structuralDescriptors` | The field tree the stream exposes |
| `defaultSeries` | Field paths visible when the layout first assembles |
| `describeFields()` | The same descriptor set, for consumers that prefer a call |
| `projectField()` | Turns samples into series points for one field |
| `defaultLayout` | Layout fragment used by the provider |

## Descriptors

A descriptor is either a leaf series or a branch with children:

```ts
const close = {
  identifier: { fieldPath: 'close' },
  kind: 'series',
  seriesKind: 'candlestick',
};

const ohlc = {
  children: new Set([open, high, low, close]),
  identifier: { fieldPath: 'ohlc' },
  kind: 'branch',
};
```

The field path is the stable name of a series. It appears in the default visible set, in snapshots, and in the projection call. Two streams must not reuse the same path for different meaning.

`seriesKind` selects the adapter: `area`, `bar`, `baseline`, `candlestick`, `histogram`, or `line`. The adapter decides what point shape `projectField` must return.

## Projection

`projectField` receives the samples for the current cycle and one field path, and returns points the adapter accepts:

```ts
projectField({ dataSamples, fieldPath }) {
  return new Set(
    Array.from(dataSamples).map(({ data, time }) => ({
      time,
      value: {
        close: data.close,
        high: data.high,
        low: data.low,
        open: data.open,
      },
    })),
  );
}
```

Two shapes are common:

- **OHLC adapters** take `{ time, value: { open, high, low, close } }`.
- **Value adapters** take `{ time, value: number }`.

Numbers are plain. The package does not unwrap domain value objects; convert them here.

## Default visibility

```ts
const defaultSeries = new Set(['close']);
```

Only listed fields are visible when the schema first assembles the layout. A consumer can toggle others later; the default is the starting state, not a restriction.

A group with no visible field is omitted from the chart entirely, so an empty default means "declared but not shown".

## Naming

`streamName` and `providerName` are display strings. The package composes pane and series titles from them plus the field path, removing repeated segments. Give them the words a person would read, not identifiers.

When a name changes, the next reconcile updates titles without rebuilding series.

## Checklist

- [ ] Every series has a unique field path.
- [ ] `seriesKind` matches the point shape returned by `projectField`.
- [ ] Projection returns plain numbers, not domain value objects.
- [ ] `defaultSeries` contains only paths that exist in the descriptors.
- [ ] `structuralDescriptors` and `describeFields()` expose the same set.
