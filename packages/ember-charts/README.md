# @lightweight-schema-charts/ember

Ember host for [Lightweight Schema Charts](../..). It builds a chart from declared data streams and reconciles changes into Lightweight Charts.

## Status

The package renders and is covered by an acceptance test for mount, data update, and teardown. Its public surface is still provisional: the schema factory, contracts, and modifier are usable, but the API may change while the neutral core is extracted.

## What it provides

| Export                       | Purpose                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `createReactiveChartSchema`  | Builds the chart schema from consumer-supplied providers and presenters      |
| `ReactiveChartSchema`        | The schema class, exposing `state`, layout, and series toggling              |
| `SeriesAdapterRegistry`      | Looks up a series adapter by series type                                     |
| `adapters`                   | The six built-in adapters: area, bar, baseline, candlestick, histogram, line |
| `ChartLwcAdapterModifier`    | Ember modifier that renders and reconciles chart state                       |
| `DataProviderLike`           | Contract a consumer implements for each data source                          |
| `DataStreamPresenterLike`    | Contract describing a stream, its fields, and its projection                 |
| `DataStreamPresenterFactory` | Plugin seam mapping a consumer's provider types to presenters                |

## Consumer wiring

A consumer supplies three things: provider instances, a presenter factory, and a domain context.

```ts
import { createReactiveChartSchema } from "@lightweight-schema-charts/ember";

const schema = createReactiveChartSchema({
  getDataProviders: () => new Set([myProvider]),
  presenterFactory: {
    makeDataStreamPresenter: ({ dataProvider, dataStreamIdentifier }) =>
      presenterFor({ dataProvider, dataStreamIdentifier }),
  },
});
```

The provider contract requires a stable `identifier`, `name`, `stableLayoutKey`, stream identifiers, a default layout, `getCursor`, `getDataSince`, `getDataState`, and `groupIdFor`. `getDataState` returns plain values — cursor, data hash, sample count, projection id — so the schema never reads a consumer model. `groupIdFor` supplies the stable identity used by layout and diffing.

The presenter contract requires `streamName`, `providerName`, `structuralDescriptors`, `defaultSeries`, and `projectField`. Descriptors declare the series fields a stream exposes; `projectField` turns a raw sample into the point shape the adapter expects.

The modifier takes the schema state, an adapter registry, and a domain context of sample count, timeframe label, and instrument name:

```gts
<div
  style="height: 320px; width: 640px"
  {{ChartLwcAdapterModifier this.state this.registry this.domainContext}}
></div>
```

## Known limitations

- Teardown removes series and panes but does not call `chart.remove()`; the chart instance is not disposed.
- Declarations are not emitted by the default `build` script.
- Part of the projection path still uses an internal currency value type.
- The public types do not mark internal modules as off limits; treat the exports above as the surface.

## Development

The repository-level development container owns the toolchain.

```sh
mise run install
mise run build
mise run test
```

Package-local commands run through `pnpm --filter @lightweight-schema-charts/ember <script>` inside the container.

## Roadmap

See [ROADMAP.md](../../ROADMAP.md).
