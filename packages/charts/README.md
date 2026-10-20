# @chart-kit/core

Framework-neutral chart engine for composing Lightweight Charts series from explicit application inputs.

## Status

Scaffolding only. The package currently exports no runtime API.

## Intended scope

- Normalized chart state for panes, series groups, and visible series.
- Narrow data-source and presenter ports.
- Snapshot and change detection.
- Series adapters and Lightweight Charts conversion.
- Chart creation, update, and destruction.

The package does not depend on Ember, Glimmer, an application store, a component library, or the test application.

## Development

The repository-level development container owns the toolchain.

```sh
mise run install
mise run build
```
