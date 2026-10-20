# @lightweight-schema-charts/ember

Ember integration for mounting, updating, and destroying a chart built with `@lightweight-schema-charts/core`.

## Status

Scaffolding only. The package currently exports a package identity constant; the chart binding follows.

## Intended scope

- Join an Ember element lifecycle to the neutral chart engine.
- Schedule chart work after render.
- Cancel pending work and destroy the chart when the host is destroyed.
- Expose chart state and actions to the consuming application without taking ownership of toolbars, dialogs, or application data.

## Development

The package is built with Rollup. Public type declarations will be added with the first stable runtime API. The repository-level development container owns the toolchain.

```sh
mise run install
mise run build
```

Package-local commands are available through `pnpm --filter @lightweight-schema-charts/ember <script>` from inside the repository container.
