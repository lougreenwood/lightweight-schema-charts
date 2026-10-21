# Architecture overview

Status: the Ember package renders and reconciles a chart. The framework-neutral core is a placeholder, and discrete event streams are a design direction rather than an implementation.

## What the package does

A consumer declares data streams. Presenters describe what each stream contains and how to project it. The schema composes those declarations into panes, groups, and visible series. A modifier reconciles the composed state into Lightweight Charts and updates it incrementally.

The package never reads a consumer's models. Everything it needs arrives through contracts.

## Layers

```text
consumer models
      │
      ▼
data providers ──────► streams, cursor, samples, data state, group identity
presenters ──────────► names, descriptors, default fields, projection
      │
      ▼
chart schema ─────────► panes → groups → series (derived, not synchronised)
      │
      ▼
modifier ─────────────► create, backfill, update, remove
      │
      ▼
Lightweight Charts
```

## Responsibilities

**Consumer.** Supplies providers, a presenter factory, and a small domain context. Owns models, fetching policy, and anything above the chart.

**Providers.** One per data source. Expose stream identifiers, a default layout fragment, a cursor, incremental fetching, plain data state, and a stable group identity.

**Presenters.** One per stream. Declare names, structural descriptors, default visible fields, and the projection from a raw sample to a series point.

**Schema.** Derives chart state from layout and provider membership. It stores no duplicate copy of that state, so stale state is structurally impossible. It owns layout composition: default fragments from providers, then the consumer's visibility and ordering overlay.

**Modifier.** Owns the chart instance and applies state changes. It creates the chart once, schedules work after render, and reconciles additions, removals, rebuilds, updates, and renames.

## Contracts

| Contract | Direction | Purpose |
| --- | --- | --- |
| `DataProviderLike` | consumer → package | Streams, cursor, fetching, data state, group identity |
| `DataStreamPresenterLike` | consumer → package | Names, descriptors, default fields, projection |
| `DataStreamPresenterFactory` | consumer → package | Maps the consumer's provider types to presenters |
| `ChartState` | package internal | Panes, groups, series fields, data state |

## Related documents

- [Streams and samples](streams-and-samples.md)
- [Composition and reconciliation](composition-and-reconciliation.md)
- [Roadmap](../../ROADMAP.md)
