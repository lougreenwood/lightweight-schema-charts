import { resolve, all } from 'true-myth/task';

/** Wraps pre-built entries into a ReadonlyMap. */

/** Processes each entry through `processEntry`, chaining onto the existing Task value. */

/** Creates entries from raw keys, building each entry's Task via `createEntry`. */

/** Creates entries from raw keys, building each entry's Task via `processEntry` sequentially. */

function makeAnnotatedTaskMap(arg) {
  if (Array.isArray(arg)) {
    return new Map(arg);
  }
  if ('processEntry' in arg) {
    if ('entries' in arg) {
      const {
        entries,
        processEntry
      } = arg;
      return [...entries.entries()].reduce((chain, [id, entry]) => chain.andThen(results => resolve([...results, [id, {
        metadata: entry.metadata,
        value: entry.value.andThen(value => processEntry({
          id,
          metadata: entry.metadata,
          value
        }))
      }]])), resolve([])).map(entries => new Map(entries));
    }
    const {
      createMetadata,
      keys,
      processEntry
    } = arg;
    return keys.reduce((chain, key) => chain.andThen(results => resolve([...results, [key, {
      metadata: createMetadata(key),
      value: processEntry(key)
    }]])), resolve([])).map(entries => new Map(entries));
  }
  const {
    createMetadata,
    createEntry,
    keys
  } = arg;
  return all(keys.map(createEntry)).map(values => new Map(keys.map((key, i) => [key, {
    metadata: createMetadata(key),
    value: values[i]
  }])));
}

export { makeAnnotatedTaskMap };
//# sourceMappingURL=annotated-task-map.js.map
