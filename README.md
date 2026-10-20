# Chart Kit

Independent chart packages for building interactive financial charts with Lightweight Charts.

## Status

The workspace, repository-owned development container, package builds, and Ember test host are in place. Chart runtime implementation and the acceptance test are still being added. Nothing is published.

## Packages

| Package            | Purpose                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| `@chart-kit/core`  | Framework-neutral chart engine, state contracts, series adapters, and reconciliation |
| `@chart-kit/ember` | Ember integration for mounting, updating, and destroying a chart                     |

The package names are working names until public naming is settled.

## Workspace

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

The Dev Container forwards port 4200 for the test application.

## Dependency direction

```text
Ember host ─→ @chart-kit/ember ─→ @chart-kit/core ─→ lightweight-charts
```

The core package is framework-neutral. It does not depend on Ember, Glimmer, an application store, a component library, or this repository's test application.

## Milestone scope

The first working milestone will provide:

- A neutral chart engine that accepts explicit data-source, presenter, theme, label, and diagnostic inputs.
- Six series adapters: area, bar, baseline, candlestick, histogram, and line.
- Create, update, and destroy lifecycle behavior.
- An Ember binding that schedules updates and owns teardown.
- One Ember runtime test using deterministic synthetic candles to verify mount, update, and destruction.
- A host application built with the package rather than directly against source files.

The current workspace contains the buildable package and test-app scaffolding. The chart runtime implementation follows.

Documentation websites, publication, a complete test matrix, and a stable public API are not part of this milestone.

## Development

This repository owns its toolchain and development container. No host `pnpm install` is required.

```sh
mise run container:up
mise run install
mise run build
mise run lint
mise run typecheck
mise run format:check
mise run test
```

Run `mise run container:shell` to open a shell inside the container, then use package-local `pnpm` commands.

## License

Not yet selected. Do not publish or redistribute this repository until licensing is settled.
