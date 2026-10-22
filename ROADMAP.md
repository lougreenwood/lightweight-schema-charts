# Roadmap

This roadmap records known engineering work in the current implementation. It is not the full product plan. A broader roadmap covering generalization and full-featured charting will be assembled during the documentation-context extraction, before any documentation site is built.

Engineering debt is listed with enough detail to act on. Product direction is listed as categories to be specified, not as commitments.

## Correctness and lifecycle

- **Dispose the chart on teardown.** The modifier removes series and panes but never calls `chart.remove()`. Add an exact-once destruction path and assert disposal rather than only DOM removal.
- **Cancel scheduled work before disposal.** The modifier schedules DOM work after render. Ensure queued work cannot touch a destroyed chart, and cover rapid mount/unmount.
- **Prove incremental updates stay incremental.** The acceptance test asserts series identity across an update. Extend that to rebuild-triggering changes so a regression to rebuild-on-every-change still fails.
- **Handle zero-size hosts.** `autoSize` chart creation assumes a laid-out element. Define behaviour when the host has no dimensions yet.

## Boundaries and plugins

- **Extend value-handler coverage.** Consumer-registered handlers now interpret unknown projected values into validated scalar/OHLC points. Cover additional value families without adding domain types to the package.
- **Make the public declarations self-sufficient.** Emitted declarations reference `NodeJS.CallSite`; a consumer currently needs `@types/node` and `skipLibCheck`. Trace the source, remove Node types from the public declaration program, and re-run the consumer check without `skipLibCheck`.
- **Make the export map honest.** The `./*` subpath advertises declaration paths for internal modules that declaration emit does not produce. Either emit the full graph or narrow `exports` to curated subpaths, verified with `publint`/`attw` and a deep-import consumer.
- **Exercise the real Git install.** Prove `github:<owner>/<repo>#<sha>&path:/packages/ember-charts` through pnpm's Git fetcher. Because GitHub resolves to a tarball, build output is committed; keep `prepare` for clone-based installs and keep the mounted `file:` variant only as a fallback.
- **Verify committed build output.** Add a CI check that rebuilding leaves `dist/` and `declarations/` unchanged, so the pinned tarball cannot silently drift from source.
- **Finish the vendored-support decoupling.** Error constructors and the logger remain copies. Replace them with package-local support or an injected diagnostics port.
- **Prove the provider create-error path.** The fixture returns `never` for create failures. Use a real error type so the public base's consumer-visible failure branch is exercised.
- **Prefer factories over abstract bases.** The provider and presenter contracts are structural, so the shipped abstract classes are an implementation choice, not part of the public shape. Evaluate factory functions that close over explicit state — or a small state object plus pure helpers — as the primary construction API once consumer registrations stabilize. Nice-to-have; not a cutover blocker. See the construction example below.

### Construction API: factories instead of base classes

Today a provider must extend a class, declare its own static type, and satisfy abstract members:

```ts
export class MarketDataDataProvider extends AbstractDataProvider<
  typeof MarketDataDataProvider,
  DataProviderInstanceContext
> {
  protected readonly staticSide = MarketDataDataProvider;
  static readonly dataSampleSource = Object;
  static readonly dataStreamIdentifiers = new Set([...]);

  static create({ context, identifier }) { ... }
  static discoverIdentifiers(context) { ... }
  static getDataSource({ context }) { ... }

  protected _dataSampleSourceAdapter({ dataSampleSource }) { ... }
  protected _dataSampleSourceRecordsSince({ sinceDate }) { ... }
}
```

A factory returns the same structural contract without inheritance, statics, or protected members:

```ts
export function createMarketDataDataProvider({
  dataSource,
  identifier,
  context,
}: {
  dataSource: MarketDataDataStreamModel;
  identifier: MarketDataIdentifier;
  context: DataProviderInstanceContext;
}): DataProviderLike {
  // Shared behavior comes from pure helpers or a small state record.
  const state = createProviderState();
  const staticSide = { dataSampleSource: Object, dataStreamIdentifiers: new Set([...]) };

  return {
    dataSource,
    defaultLayout: defaultLayoutFor(staticSide, identifier),
    identifier,
    name: dataSource.name,
    stableLayoutKey: identifier.id,
    dataStreamIdentifiers: staticSide.dataStreamIdentifiers,
    getCursor: ({ dataStreamIdentifier }) => getProviderCursor({ state, dataStreamIdentifier }),
    getDataSince: ({ cursor, dataStreamIdentifier }) =>
      fetchProviderSamples({ state, staticSide, dataSource, cursor, dataStreamIdentifier }),
    getDataState: ({ dataStreamIdentifier }) => deriveDataState({ dataSource, dataStreamIdentifier }),
    groupIdFor: ({ dataStreamIdentifier }) => `${identifier.id}::${dataStreamIdentifier.type}`,
  };
}
```

The shared pieces currently living in the base become named functions or a small state object:

```ts
export function createProviderState() {
  return { cursorByStream: new Map<string, DataProviderCursor>() };
}

export function fetchProviderSamples({ state, staticSide, dataSource, cursor, dataStreamIdentifier }) {
  // validate stream, map records to samples, finalize the batch, advance the cursor
}
```

Presenters follow the same shape: a factory closes over the tracked descriptor map and returns `describeFields`, `projectField`, `getStreamDataSource`, and the layout fields directly, instead of subclassing and implementing protected hooks.

Benefits:

- **No inheritance surface.** Nothing is protected, abstract, or overridden; the contract is satisfied structurally, which is what consumers already depend on.
- **Explicit dependencies.** Everything a provider needs arrives in its arguments, instead of being reached through `this`, `super`, or static members.
- **Smaller state.** Only the cursor map and whatever the closure captures; no class instance, no `staticSide`, no static-type gymnastics.
- **Easier tests.** Call the factory with fakes and assert on the returned functions; no subclass to construct, no abstract members to stub.
- **Composition over inheritance.** Multiple variants compose helpers instead of forming a class hierarchy, matching the project's direction.
- **Avoids the static-side problem.** The concrete class type no longer needs to be threaded through a generic to type static members.

Costs and constraints:

- The shared behavior in both bases — cursor storage, batch finalization, descriptor caching, default field selection, projection orchestration — must be extracted into functions before any class can be replaced.
- The presenter base uses `trackedMap` for descriptor caching; the closure must preserve that reactivity exactly, or empty-to-populated updates regress.
- It touches every provider and presenter, including the five indicator presenters, so it needs its own test pass.
- It is post-cutover work. Do not reshape construction while the application is still moving onto the package.
- **Document the plugin boundary.** Provider and presenter are the only integration surface. Make that explicit in the architecture overview, with the reference adapter as the example.

## Core extraction

- **Move the neutral renderer into the core.** Diff, adapters, converters, lifecycle, and explicit theme and label inputs belong in `@lightweight-schema-charts/core`.
- **Prove the core without Ember.** A plain-DOM consumer must render and update before any framework-neutral claim is made.
- **Keep composition in the host package.** The reactive schema is Ember composition over core contracts; it should not follow the renderer downward.
- **Support additional frameworks.** Each binding consumes the same core contracts and owns only its scheduling and element lifecycle.

## Declarative surface

- **Formalize controls and overlays.** Visibility toggles, pane labels, series titles, and legends should be declared inputs rather than modifier arguments.
- **Define stream declaration.** A stream should declare its series kind and default visibility without an application configuration object.
- **Specify the descriptor grammar.** Document descriptor kinds, nesting, and the mapping from descriptor to series field, with examples.

## Testing

No chart tests were ported from the application. The suite is new work: one acceptance test covers a wrapped-value candlestick path, an incremental update, custom formatting, handler-error notification, and DOM removal; unit tests cover handler dispatch, validation, and lookup failures.

- **Unit.** Snapshot capture and diff precedence, including the cases that must do nothing; conversion for each series kind; projection for each point shape; layout assembly from fragments and overlay; label composition.
- **Contract conformance.** A reusable suite that any provider and presenter can run against its own implementations, so a consumer can prove it satisfies the contract rather than discovering mismatches at runtime.
- **Acceptance.** The current test covers mount, one incremental update, custom formatting, handler-error notification, and DOM removal. Add rebuild and rename, failure-then-retry after a rejected value, multi-pane composition, visibility toggles, rapid mount and unmount, and teardown with no post-destroy callbacks.
- **Lifecycle.** Assert chart disposal once implemented, not merely DOM removal.
- **Regression.** One deterministic synthetic fixture per case, so a failure reproduces exactly.
- **Environment.** Runs in the repository container, headless and deterministic, alongside the existing acceptance test.

## Known defects

Defects present in the current implementation. Each is open until the linked work lands.

| Defect                                               | Effect                                                                          | Where                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| The chart instance is never disposed                 | Memory and observers retained after unmount; DOM removal hides it               | `chart/modifiers/chart-lwc-adapter.ts` |
| A series is skipped when no adapter matches its kind | The series is missing with only a log entry; no visible or programmatic signal  | `chart/modifiers/chart-lwc-adapter.ts` |
| A zero-size host has no defined behaviour            | `autoSize` may produce a chart with no dimensions until the element is laid out | `chart/modifiers/chart-lwc-adapter.ts` |

## Delivery

- **Maintain packed-consumer checks.** Declarations now build with runtime output. Continue checking a separate installed consumer, not only workspace links.
- **Verify hosted CI.** The workflow runs install, build, lint, typecheck, test, and format; its presence alone is not evidence of a passing hosted run.
- **Replace placeholder metadata before release.** Version is `0.0.0`, the package is private, and `repository` is empty. This is acceptable for a pinned Git dependency, not for publication.
- **Record the lint boundary.** `src/vendor/` is excluded from lint so the gate stays meaningful for package-owned code. Revisit when vendored support is replaced.
- **Land the test suite** described under Testing, including contract conformance for consumers.
- **Documentation site.** Synthetic data only, covering core and Ember usage.

## Planned expansion

Mined from the project's chart and data-stream documentation during the documentation-context extraction. Items are generalised: the shape is preserved, the originating domain is not.

### Data model

- **Discrete event streams.** Sparse, ordered events with arbitrary gaps, rendered as markers or bands rather than connected series. The current stream model assumes density; this needs a distinct series kind and a projection contract that tolerates absence.
- **Multi-resolution streams.** One logical stream exposing several embedded window sizes behind a single identity, instead of one stream instance per interval.
- **Stream projection facade.** A single handle for a logical stream that stays stable while its underlying interval or configuration changes, so consumers do not re-resolve providers when a control changes.
- **Backfill for late streams.** A stream added after processing has started must be able to request history and signal readiness, rather than appearing empty indefinitely.

### Composition

- **Provider composition.** Group providers that describe one logical source, so a pane can be assembled from several providers without flattening them first.
- **Dependency-aware invalidation.** When one stream is derived from another, a change in the source should rebuild dependents in order, without the consumer coordinating that manually.
- **Derived-stream computation.** A reusable compute abstraction for streams whose values are calculated from other streams, separating computation from view state and error handling.

### Interaction and controls

- **Declarative controls.** Visibility, timeframe, series selection, and configuration surfaces expressed as declared state, so a host renders its own controls without the chart owning them.
- **Annotation and overlay layer.** User and system annotations attached to time or price, rendered above series and surviving data updates.
- **Range and zoom policy.** A declared policy for initial focus, preservation across updates, and behaviour when the data window changes.

### Platform

- **Framework-neutral core.** Extract the renderer from the host package and prove it without a framework binding.
- **Additional bindings.** Each host consumes the same core contracts and owns only its scheduling and element lifecycle.
- **Additional value structures.** Extend the existing consumer-registered handler seam when new scalar/OHLC structures arrive; other rendering kinds need their own contracts.

### Explicitly not in scope

These are consumer concerns that appeared in the source material and do not belong in the library:

- Ingestion, repair, and reconciliation of upstream data.
- Persistence of layouts and user preferences; the package accepts and returns an overlay.
- Authentication, subscriptions, and transport.
- Backend coordination and job orchestration.
