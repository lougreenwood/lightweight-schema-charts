# Implement a presenter

A presenter describes one stream: how it is named, which series fields it exposes, and how a raw sample becomes a series point. It never fetches.

## Required surface

| Member                  | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `dataProvider`          | The provider this stream belongs to                       |
| `dataStreamIdentifier`  | The stream being described                                |
| `streamName`            | Display name for the series                               |
| `providerName`          | Display name for the provider                             |
| `structuralDescriptors` | The field tree the stream exposes                         |
| `defaultSeries`         | Field paths visible when the layout first assembles       |
| `describeFields()`      | The same descriptor set, for consumers that prefer a call |
| `projectField()`        | Turns samples into series points for one field            |
| `defaultLayout`         | Layout fragment used by the provider                      |

## Descriptors

A descriptor is either a leaf series or a branch with children:

```ts
const close = {
  identifier: { dataStreamIdentifier, fieldPath: 'data.close' },
  kind: 'series',
  seriesKind: 'candlestick',
  label: 'Close',
};

const ohlc = {
  children: new Set([open, high, low, close]),
  identifier: { dataStreamIdentifier, fieldPath: 'data.ohlc' },
  kind: 'structural',
  structuralGroupType: 'composite',
  label: 'OHLC',
};
```

The field path is the stable name of a series. It appears in the default visible set, in snapshots, and in the projection call. Two streams must not reuse the same path for different meaning.

`seriesKind` selects the adapter: `area`, `bar`, `baseline`, `candlestick`, `histogram`, or `line`. `valueHandler`, when present, selects the consumer's interpreter. `CompleteLeafStructuralDescriptor<TDataStreamIdentifier>` preserves the stream type; its type argument is required.

## Projection

`projectField` receives the samples for the current cycle and one field path. It returns `ReadonlySet<ProjectedSeriesPoint>`: `{ time: Date; value: unknown }`. The value may be a plain number or a consumer object. The renderer interprets it only after selecting the handler:

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

The built-in numeric handler accepts two shapes:

- **OHLC adapters** take `{ time, value: { open, high, low, close } }`.
- **Value adapters** take `{ time, value: number }`.

For domain values, keep projection unchanged and register a handler. This scalar example interprets an object with a `magnitude` property:

```ts
import { SeriesAdapterRegistry, validateSeriesNumber } from '@lightweight-schema-charts/ember';
import type { SeriesValueHandler } from '@lightweight-schema-charts/ember';

const measurement: SeriesValueHandler = {
  id: 'measurement',
  toNumber(value) {
    if (value && typeof value === 'object' && 'magnitude' in value) {
      return validateSeriesNumber(value.magnitude);
    }
    return validateSeriesNumber(value);
  },
  priceFormat: {
    type: 'custom',
    minMove: 0.001,
    formatter: (value) => `${value.toFixed(3)} u`,
  },
};

const registry = new SeriesAdapterRegistry({
  valueHandlers: [measurement],
});
```

Set `valueHandler: 'measurement'` on a scalar descriptor. For `bar` and `candlestick`, implement `toOhlc` and return `validateSeriesOhlc` over the interpreted four numbers. Dispatch comes from `seriesKind`, not from whether the input happens to have an `open` property. Both methods return typed `Result` values; handlers must not throw. Numeric output is checked for finiteness even after a handler reports success.

An absent handler name selects the built-in `numeric` handler, which validates plain numeric values. A descriptor may also name `'numeric'` explicitly. An unknown selected name is an error, not a fallback. The modifier logs failures and calls `onError`, when supplied, with `{ error, fieldPath, groupId }`; consumers can show `error.errorCode` in their own UI. A failed interpretation creates no series; a failed rebuild keeps the previous one; the group is retried on the next reconciliation. `onReady` supplies `{ chart, applyTheme }` for host integrations.

The exported presenter base is `AbstractDataStreamPresenter<TDataProvider, TDataStreamIdentifier, TDataSource>`. Every argument is required. See `test-app/app/synthetic/synthetic-presenter.ts` for a cast-free implementation over wrapped candle values.

## Default visibility

```ts
const defaultSeries = new Set(['data.close']);
```

Only listed fields are visible when the schema first assembles the layout. A consumer can toggle others later; the default is the starting state, not a restriction.

A group with no visible field is omitted from the chart entirely, so an empty default means "declared but not shown".

## Naming

`streamName` and `providerName` are display strings. The package composes pane and series titles from them plus the field path, removing repeated segments. Give them the words a person would read, not identifiers.

When a name changes, the next reconcile updates titles without rebuilding series.

## Checklist

- [ ] Every series has a unique field path.
- [ ] The selected handler supports the descriptor's `seriesKind`.
- [ ] Domain-valued descriptors name a registered handler; numeric descriptors may use the default.
- [ ] `defaultSeries` contains only paths that exist in the descriptors.
- [ ] `structuralDescriptors` and `describeFields()` expose the same set.
