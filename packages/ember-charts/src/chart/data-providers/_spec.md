## TODO

### The type of the `dataProviderIdentifier` on the `dataStreamIdentifier` should be constrained to it's provider

- DataProviders have `discoverIdentifiers`, from this we can use `InferDataProviderIdentifier` to get the type of the provider
- All streams returned by that provider (via `static dataStreamIdentifiers` and `get dataStreamIdentifiers`) should be constrained to that type
- It would make sense to even compute the identifier for the provider on the instance and just always use that for the stream identifiers
