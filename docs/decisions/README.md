# Decisions

Records of why the package is shaped the way it is. Each entry states the context, the decision, the alternatives rejected, and the consequences a maintainer inherits.

| Record | Subject |
| --- | --- |
| [0001](0001-first-milestone-scope.md) | First milestone is the Ember integration path |
| [0002](0002-schema-derived-state.md) | Chart state is derived, never synchronised |
| [0003](0003-provider-supplied-data-state.md) | Data state and group identity come from the provider |
| [0004](0004-presenter-factory-boundary.md) | Presenters are supplied through a consumer factory |
| [0005](0005-copy-first-extraction.md) | Copy the working implementation first, decouple after |
| [0006](0006-rebuild-before-update.md) | Rebuild takes precedence over incremental update |

These are provenance, not instructions. Current behaviour is documented in [the architecture](../architecture/overview.md) and [the guides](../guides/README.md).
