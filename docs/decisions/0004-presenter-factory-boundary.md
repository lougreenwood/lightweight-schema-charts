# Decision 0004: Presenters are supplied through a consumer factory

Date: 2026-10-21
Status: accepted

## Context

A presenter knows how a specific stream becomes series fields and points. The package needs a presenter per stream, and it needs to choose the right one for each provider it is given.

The original design used a registry with a compile-time map from provider type to presenter type. That is precise, and it is closed: the package must enumerate every supported provider type.

## Decision

The consumer supplies a factory implementing one method:

```ts
makeDataStreamPresenter({ dataProvider, dataStreamIdentifier }) => DataStreamPresenterLike
```

The schema asks the factory for a presenter and never learns which provider types exist.

## Alternatives rejected

- **A registry keyed by provider type inside the package.** Every new provider type requires a package change, which makes the package the bottleneck and limits consumers to the enumerated set.
- **A single generic presenter for all streams.** Loses stream-specific descriptors and projection, which is the part that differs most.
- **Passing presenters in alongside providers.** Duplicates the matching logic in every consumer and allows the two collections to disagree.

## Consequences

- Provider types are open. A consumer can introduce new streams without a package release.
- The factory is the only place that maps provider shape to presenter. A mismatch surfaces as wrong fields rather than a type error, so consumers should keep that mapping small and explicit.
- The package cannot validate that a presenter matches its provider. It trusts the factory.
- Presenter construction stays cheap and stateless, because the schema may call the factory while deriving state.
