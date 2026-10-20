# Chart Kit test app

A small Ember application that consumes the packages in this repository.

## Development

The repository owns the development environment. Start the container from the repository root:

```sh
mise run container:up
mise run container:shell
```

Then run the app from inside the container:

```sh
pnpm --filter test-app start
```

The Dev Container forwards port 4200, so the app is available at `http://localhost:4200`.

## Checks

From the repository root:

```sh
mise run build
mise run test
mise run lint
mise run typecheck
```
