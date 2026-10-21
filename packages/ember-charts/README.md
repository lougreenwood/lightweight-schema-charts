# @lightweight-schema-charts/ember

Ember host for [Lightweight Schema Charts](../..). It builds a chart from declared data streams and reconciles changes into Lightweight Charts.

## Status

The package renders and is covered by an acceptance test for mount, wrapped-value conversion, an incremental update, custom formatting, handler-error notification, and teardown. Its public surface is still provisional: the schema factory, contracts, and modifier are usable, but the API may change while the neutral core is extracted.

## What it provides

| Export                                                                     | Purpose                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `createReactiveChartSchema`                                                | Builds the chart schema from consumer-supplied providers and presenters              |
| `ReactiveChartSchema`                                                      | The schema class, exposing `state`, layout, and series toggling                      |
| `SeriesAdapterRegistry`                                                    | Looks up a series adapter by series type                                             |
| `adapters`                                                                 | The six built-in adapters: area, bar, baseline, candlestick, histogram, line         |
| `ChartLwcAdapterModifier`                                                  | Ember modifier that renders and reconciles chart state                               |
| `DataProviderLike`                                                         | Contract a consumer implements for each data source                                  |
| `DataStreamPresenterLike`                                                  | Contract describing a stream, its fields, and its projection                         |
| `DataStreamPresenterFactory`                                               | Plugin seam mapping a consumer's provider types to presenters                        |
| `AbstractDataProvider`, `AbstractDataStreamPresenter`                      | Optional generic bases for consumer implementations; all type arguments are required |
| Layout, descriptor, stream, sample, and identity types                     | Public contracts for composing the schema and its inputs                             |
| `SeriesValueHandler`, `SeriesValueHandlers`                                | Typed conversion and formatting supplied by the consumer                             |
| `ProjectedSeriesPoint`, `SeriesValueFailure`                               | Unknown-valued projection input and modifier error notification                      |
| `validateSeriesNumber`, `validateSeriesOhlc`                               | Finite numeric validation for handler implementations                                |
| `numericSeriesValueHandler`                                                | Built-in `numeric` handler; also selected when a descriptor names no handler         |
| `interpretProjectedPoints`                                                 | Shared batch interpreter used by the modifier; exported for host-side testing        |
| `ChartLayout`                                                              | Layout composition and visibility overlay used by the schema                         |
| `SeriesValueHandlerNotFoundError` and the other `SeriesValue*` error types | Typed handler lookup and validation failures                                         |

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

The presenter contract requires `streamName`, `providerName`, `structuralDescriptors`, `defaultSeries`, and `projectField`, plus its provider/stream identity, layout, and data-source access. A projected point contains a `Date` and an unknown value. A descriptor can name a registered handler that interprets that value for the selected series kind. Without a name, the built-in handler validates plain numeric values; it never unwraps domain objects.

Handlers return `Result`, not exceptions. OHLC series require `toOhlc`; scalar series use `toNumber`, regardless of the input object's property names. Optional `priceFormat` uses Lightweight Charts' custom-format type, including its required `minMove`. Unknown handler names and invalid values reach the modifier's optional `onError` callback as a `SeriesValueFailure` and are logged without raw values. See [the presenter guide](../../docs/guides/implement-a-presenter.md).

The modifier takes the schema state, an adapter registry, and a domain context of sample count, timeframe label, and instrument name:

```gts
<div
  style="height: 320px; width: 640px"
  {{ChartLwcAdapterModifier this.state this.registry this.domainContext}}
></div>
```

## Known limitations

- Teardown removes series and panes but does not call `chart.remove()`; the chart instance is not disposed.
- `build` emits declarations before runtime modules; failed declaration checks stop the build and leave no partial declarations.
- The public types do not mark internal modules as off limits; treat the exports above as the surface.

## Development

The repository-level development container owns the toolchain.

```sh
mise run install
mise run build
mise run test
```

Package-local commands run through `pnpm --filter @lightweight-schema-charts/ember <script>` inside the container.

`prepare` and `prepack` run the full build. For pnpm Git dependencies, select `#<commit>&path:/packages/ember-charts`; selecting the repository root installs the workspace package, not this addon. The consumer must explicitly allow the Git dependency's build scripts. A packed-artifact check and a Git-install check are separate proofs.

pnpm resolves a GitHub specifier to a repository tarball rather than a Git clone, so its `prepare` script is not run. The addon therefore commits `dist/` and `declarations/` so a pinned GitHub dependency is consumable. Rebuild and commit them whenever source changes; CI should verify they are current.

## Roadmap

See [ROADMAP.md](../../ROADMAP.md).
