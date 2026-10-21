import { resolve, all } from 'true-myth/task';

/** Wraps pre-built entries into a ReadonlySet. */

/** Processes each entry through `processEntry`, chaining onto the existing Task value. */

/** Creates entries from raw keys, building each entry's Task via `createEntry`. */

/** Creates entries from raw keys, building each entry's Task via `processEntry` sequentially. */

function makeAnnotatedTaskSet(arg) {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }
  if ('processEntry' in arg) {
    if ('entries' in arg) {
      const {
        entries,
        processEntry
      } = arg;
      return [...entries].reduce((chain, entry) => chain.andThen(results => resolve([...results, {
        metadata: entry.metadata,
        value: entry.value.andThen(value => processEntry({
          metadata: entry.metadata,
          value
        }))
      }])), resolve([])).map(entries => new Set(entries));
    }
    const {
      createMetadata,
      keys,
      processEntry
    } = arg;
    return keys.reduce((chain, key) => chain.andThen(results => resolve([...results, {
      metadata: createMetadata(key),
      value: processEntry(key)
    }])), resolve([])).map(entries => new Set(entries));
  }
  const {
    createEntry,
    createMetadata,
    keys
  } = arg;
  return all(keys.map(createEntry)).map(values => new Set(keys.map((key, i) => ({
    metadata: createMetadata(key),
    value: values[i]
  }))));
}

export { makeAnnotatedTaskSet };
//# sourceMappingURL=annotated-task-set.js.map
