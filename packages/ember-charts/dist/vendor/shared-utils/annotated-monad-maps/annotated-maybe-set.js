import { just, nothing } from 'true-myth/maybe';
import { resolve } from 'true-myth/task';

/** Wraps pre-built entries into a ReadonlySet. */

/** Processes each entry through `processEntry`, chaining onto the existing Maybe value. */

/** Creates entries from raw keys, building each entry's Maybe via `createEntry`. */

function makeAnnotatedMaybeSet(arg) {
  if (Array.isArray(arg)) {
    return new Set(arg);
  }
  if ('createEntry' in arg) {
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
  const {
    entries,
    processEntry
  } = arg;
  return [...entries].reduce((chain, entry) => chain.andThen(results => entry.value.match({
    Nothing: () => resolve([...results, entry]),
    Just: value => processEntry({
      metadata: entry.metadata,
      value
    }).map(newValue => [...results, {
      metadata: entry.metadata,
      value: just(newValue)
    }]).orElse(() => resolve([...results, {
      metadata: entry.metadata,
      value: nothing()
    }]))
  })), resolve([])).map(entries => new Set(entries));
}

export { makeAnnotatedMaybeSet };
//# sourceMappingURL=annotated-maybe-set.js.map
