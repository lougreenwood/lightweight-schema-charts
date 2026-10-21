# Decision 0003: Data state and group identity come from the provider

Date: 2026-10-21
Status: accepted

## Context

Change detection needs four values per stream: a cursor, a known sample count, a content hash, and a projection identity. In the original implementation these were derived by inspecting application model objects, which meant the schema had to recognise concrete provider shapes and read their internals.

That approach works inside one application. It fails for a package, because every consumer would have to make its providers look like that application's models.

## Decision

The provider supplies the values directly:

```ts
getDataState({ dataStreamIdentifier }) => {
  cursor, dataHash, dataLength, projectionId
}

groupIdFor({ dataStreamIdentifier }) => string
```

The package never inspects a provider's data source. It asks for four plain values and a stable identity.

## Alternatives rejected

- **Structural type guards on concrete providers.** The package would have to know every provider shape, which makes the supported set closed and forces consumers to imitate a foreign model.
- **Deriving the values from fetched samples.** Counting and hashing on every reconciliation duplicates work the consumer has already done, and cannot express projection identity at all.
- **Requiring all four values.** Many streams cannot supply a hash or a projection identity. Requiring them would force consumers to invent meaningless values.

## Consequences

- Each value is optional and its absence is meaningful: no hash means content-only updates cannot be detected; no count means empty-to-populated cannot be detected; no projection identity means reconfiguration never triggers a rebuild.
- The provider owns correctness of these values. A hash that does not track content produces missed updates, and the package cannot detect that.
- Group identity is explicit rather than inferred from layout position, so a series survives reordering and reconfiguration.
- Consumers with several configurations of the same logical stream must decide whether identity changes with configuration, and implement `groupIdFor` accordingly.
