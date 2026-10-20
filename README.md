# Lightweight Schema Charts

Independent chart packages for building interactive financial charts with Lightweight Charts.

## Status

The workspace, repository-owned development container, package builds, and Ember test host are in place. Chart runtime implementation and the acceptance test are still being added. Nothing is published.

## Packages

| Package                            | Purpose                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `@lightweight-schema-charts/core`  | Framework-neutral chart engine, state contracts, series adapters, and reconciliation |
| `@lightweight-schema-charts/ember` | Ember integration for mounting, updating, and destroying a chart                     |

The package names are working names until public naming is settled.

## Workspace

```text
charts/
├── packages/
│   ├── charts/              @lightweight-schema-charts/core
│   └── ember-charts/        @lightweight-schema-charts/ember
├── test-app/                Ember integration test application
└── docs/
    ├── architecture/
    └── decisions/
```

The Dev Container forwards port 4200 for the test application.

## Dependency direction

```text
Ember host ─→ @lightweight-schema-charts/ember ─→ @lightweight-schema-charts/core ─→ lightweight-charts
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

The current workspace contains the buildable packages, pure snapshot/diff functions, and test-app scaffolding. The chart engine, rendering ports, adapters, and real Ember binding remain unimplemented.

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

### Container volumes

Every workspace package with its own dependencies needs a `node_modules` named volume in `compose.yaml`. The root `node_modules` volume is not enough for pnpm's package-local links.

## License

Not yet selected. Do not publish or redistribute this repository until licensing is settled.
