/** Wraps pre-built entries into a ReadonlySet. */

/** Processes each entry through `processEntry`, chaining onto the existing Result value. */

/** Creates entries from raw keys, building each entry's Result via `createEntry`. */

function makeAnnotatedResultSet(arg) {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }
  if ('entries' in arg) {
    const {
      entries,
      processEntry
    } = arg;
    return new Set([...entries].map(entry => ({
      metadata: entry.metadata,
      value: entry.value.andThen(value => processEntry({
        metadata: entry.metadata,
        value
      }))
    })));
  }
  const {
    createEntry,
    createMetadata,
    keys
  } = arg;
  return new Set(keys.map(key => ({
    metadata: createMetadata(key),
    value: createEntry(key)
  })));
}

export { makeAnnotatedResultSet };
//# sourceMappingURL=annotated-result-set.js.map
