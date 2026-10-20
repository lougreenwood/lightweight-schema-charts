# @lightweight-schema-charts/core

Framework-neutral chart engine for composing Lightweight Charts series from explicit application inputs.

## Status

The package provides pure snapshot capture and group change detection. Rendering ports, series adapters, and the chart engine are not implemented yet. The API remains provisional.

## Snapshot and diff

Import `captureGroupSnapshot` and `diffGroupStates`, with their supporting types, from the package root: `@lightweight-schema-charts/core`. The package exposes one curated entry point; internal module paths are not public.

Callers assemble maps keyed by group ID. Capture plain data metadata, resolved names, and visible-field entries before comparison. After applying changes, capture fresh snapshots for the next cycle. Capture owns its own cursor copy and a sorted list of the visible field paths.

Diffs include additions, removals, rebuilds, incremental updates, and independent name changes. Unchanged dimensions have absent change fields, not a truthy status string. This does not prove chart rendering or lifecycle behavior.

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
