/** Wraps pre-built entries into a ReadonlyMap. */

/** Processes each entry through `processEntry`, chaining onto the existing Result value. */

/** Creates entries from raw keys, building each entry's Result via `createEntry`. */

function makeAnnotatedResultMap(arg) {
  if (Array.isArray(arg)) {
    return new Map(arg);
  }
  if ('entries' in arg) {
    const {
      entries,
      processEntry
    } = arg;
    return new Map([...entries.entries()].map(([id, entry]) => [id, {
      metadata: entry.metadata,
      value: entry.value.andThen(value => processEntry({
        id,
        metadata: entry.metadata,
        value
      }))
    }]));
  }
  const {
    createEntry,
    createMetadata,
    keys
  } = arg;
  return new Map(keys.map(key => [key, {
    metadata: createMetadata(key),
    value: createEntry(key)
  }]));
}

export { makeAnnotatedResultMap };
//# sourceMappingURL=annotated-result-map.js.map
