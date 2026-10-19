# Chart Kit

Independent chart packages for building interactive financial charts with Lightweight Charts.

## Status

Initial implementation. The packages and their runtime test application are being created. Nothing is published.

## Packages

| Package | Purpose |
| --- | --- |
| `@chart-kit/core` | Framework-neutral chart engine, state contracts, series adapters, and reconciliation |
| `@chart-kit/ember` | Ember integration for mounting, updating, and destroying a chart |

The package names are working names until public naming is settled.

## Planned workspace

```text
charts/
├── packages/
│   ├── charts/              @chart-kit/core
│   └── ember-charts/        @chart-kit/ember
├── test-app/                Ember integration test application
└── docs/
    ├── architecture/
    └── decisions/
```

## Dependency direction

```text
Ember host ─→ @chart-kit/ember ─→ @chart-kit/core ─→ lightweight-charts
```

The core package is framework-neutral. It does not depend on Ember, Glimmer, an application store, a component library, or this repository's test application.

## Current scope

The first working milestone provides:

- A neutral chart engine that accepts explicit data-source, presenter, theme, label, and diagnostic inputs.
- Six series adapters: area, bar, baseline, candlestick, histogram, and line.
- Create, update, and destroy lifecycle behavior.
- An Ember binding that schedules updates and owns teardown.
- One Ember runtime test using deterministic synthetic candles to verify mount, update, and destruction.
- A host application built with the package rather than directly against source files.

Documentation websites, publication, a complete test matrix, and a stable public API are not part of this milestone.

## Development

Workspace commands will be added with the package scaffolding. No dependencies or test scripts exist yet.

## License

Not yet selected. Do not publish or redistribute this repository until licensing is settled.
