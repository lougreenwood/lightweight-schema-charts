# Roadmap

This roadmap records known engineering work in the current implementation. It is not the full product plan. A broader roadmap covering generalization and full-featured charting will be assembled during the documentation-context extraction, before any documentation site is built.

Engineering debt is listed with enough detail to act on. Product direction is listed as categories to be specified, not as commitments.

## Correctness and lifecycle

- **Dispose the chart on teardown.** The modifier removes series and panes but never calls `chart.remove()`. Add an exact-once destruction path and assert disposal rather than only DOM removal.
- **Cancel scheduled work before disposal.** The modifier schedules DOM work after render. Ensure queued work cannot touch a destroyed chart, and cover rapid mount/unmount.
- **Fix or remove the vendored sample sorter.** The declaration build fails in `vendor/utils-data-stream/data-sample/conditionally-sort-data-samples.ts`. Either correct it or drop the vendored copy.
- **Handle zero-size hosts.** `autoSize` chart creation assumes a laid-out element. Define behaviour when the host has no dimensions yet.

## Boundaries and plugins

- **Remove the remaining currency dependency.** `chart/data-stream-presenters/_lib/projection-utils.ts` still reads a wrapped currency value. The adapter types and Lightweight Charts converters already take plain numbers.
- **Introduce one conversion seam.** Let consumers register `{ structure, convert }` handlers so the package never owns currency or other value semantics. This is the seam that replaces the vendored type.
- **Replace vendored support.** Type helpers, error constructors, and the logger are copies. Move them to package-local equivalents or an injected diagnostics port.
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

No chart tests exist to port. The suite is new work; today there is one acceptance test covering a single rendering path.

- **Unit.** Snapshot capture and diff precedence, including the cases that must do nothing; conversion for each series kind; projection for each point shape; layout assembly from fragments and overlay; label composition.
- **Contract conformance.** A reusable suite that any provider and presenter can run against its own implementations, so a consumer can prove it satisfies the contract rather than discovering mismatches at runtime.
- **Acceptance.** Mount, update, rebuild, rename, and removal; multi-pane composition; visibility toggles; rapid mount and unmount; teardown with no post-destroy callbacks.
- **Lifecycle.** Assert chart disposal once implemented, not merely DOM removal.
- **Regression.** One deterministic synthetic fixture per case, so a failure reproduces exactly.
- **Environment.** Runs in the repository container, headless and deterministic, alongside the existing acceptance test.

## Known defects

Defects present in the current implementation. Each is open until the linked work lands.

| Defect | Effect | Where |
| --- | --- | --- |
| The chart instance is never disposed | Memory and observers retained after unmount; DOM removal hides it | `chart/modifiers/chart-lwc-adapter.ts` |
| A series is skipped when no adapter matches its kind | The series is missing with only a log entry; no visible or programmatic signal | `chart/modifiers/chart-lwc-adapter.ts` |
| Declarations are not emitted by the build | Consumers resolve runtime code but get no published types | `packages/ember-charts/package.json` |
| Projection still wraps values in an internal currency type | Consumers without a currency concept must imitate it or convert twice | `chart/data-stream-presenters/_lib/projection-utils.ts` |
| A zero-size host has no defined behaviour | `autoSize` may produce a chart with no dimensions until the element is laid out | `chart/modifiers/chart-lwc-adapter.ts` |

## Delivery

- **Emit declarations.** Publish `.d.ts` output alongside the runtime build and verify the export map resolves for both.
- **Add CI.** Install, build, lint, typecheck, test, and format on every change.
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
- **Value conversion seam.** Consumer-registered handlers replace the remaining internal value types, so the package carries no currency or other domain conversion.

### Explicitly not in scope

These are consumer concerns that appeared in the source material and do not belong in the library:

- Ingestion, repair, and reconciliation of upstream data.
- Persistence of layouts and user preferences; the package accepts and returns an overlay.
- Authentication, subscriptions, and transport.
- Backend coordination and job orchestration.
