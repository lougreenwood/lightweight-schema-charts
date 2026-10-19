# Architecture overview

Status: planned boundary. The packages do not yet contain runtime source.

## Responsibilities

### `@chart-kit/core`

The core package owns chart behavior that is independent of a UI framework:

- Normalized chart state describing panes, series groups, and visible series.
- Narrow data-source and presenter ports.
- Snapshot and change detection.
- Reconciliation of state into Lightweight Charts panes and series.
- Six series adapters and time/value conversion.
- Chart creation, update, and destruction.
- Receipt of resolved theme values, labels, and diagnostics from the consumer.

Console and DOM dependencies are allowed. Framework runtimes, application registries, application models, and ambient theme services are not.

### `@chart-kit/ember`

The Ember package adapts the core to an Ember host:

- Receives tracked state and presentation inputs.
- Schedules DOM work after render.
- Coordinates chart updates.
- Owns destruction and cancels pending work when the host is destroyed.

It does not reimplement series creation or reconciliation.

## Data flow

```text
Consumer state and data ports
        │
        ▼
@chart-kit/core chart engine
        │
        ├─ diff structural/data changes
        ├─ create/update/remove panes and series
        └─ destroy upstream chart state
        │
        ▼
Lightweight Charts
```

The Ember package invokes the engine. Other framework consumers can invoke the same core directly.

## Inputs

The core expects explicit inputs rather than ambient services:

| Input | Purpose |
| --- | --- |
| Chart state | Panes, groups, visible series, stable group identity |
| Data-source ports | Cursor, samples, and change metadata |
| Presenter ports | Series descriptors and field projection |
| Theme | Resolved colors and chart options |
| Labels | Resolved pane and series text |
| Diagnostics | Optional reporting for descriptor and adapter failures |

## Lifecycle

1. Mount creates the Lightweight Charts instance and initial panes.
2. Each state update is diffed against the previous snapshot.
3. Structural changes add or remove pane groups.
4. Data changes append new values or rebuild a series when identity changed.
5. Destroy removes series, panes, and the upstream chart instance.
6. The host cancels scheduled work before or during destruction.

## Non-goals

- A multi-renderer abstraction over multiple chart libraries.
- Application data fetching or schema registries.
- Toolbars, dialogs, menus, or settings interfaces.
- Server-side rendering.
- A public API frozen before the integration test proves the first use case.
