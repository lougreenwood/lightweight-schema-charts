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

## Delivery

- **Emit declarations.** Publish `.d.ts` output alongside the runtime build and verify the export map resolves for both.
- **Add CI.** Install, build, lint, typecheck, test, and format on every change.
- **Broaden the test matrix.** Adapters, reconciliation cases, multi-pane layouts, removal, and failure paths.
- **Documentation site.** Synthetic data only, covering core and Ember usage.
- **Licensing.** Select a license before any distribution.

## Planned expansion

The following categories are intentionally unspecified. They will be mined from the project's chart documentation, design notes, and deferred work during the documentation-context extraction.

- Generalization beyond the first consumer: plugin-based value and data-structure support, framework bindings, and a stable public contract.
- Full-featured charting: annotations and overlays, drawing and primitives, multi-pane composition, axis and scale behaviour, crosshair and legend interaction, range and zoom policy.
- Declarative controls and layout: timeframes, series selection, indicator configuration, saved layouts, and their persistence model.
- Data and streaming: incremental backfill, cancellation, reconnection, and stale-data policy.
- Theme and presentation: theme discovery, injected design tokens, and the separation of presentation policy from the package.
- Delivery: packaging, examples, release process, and long-term support expectations.
