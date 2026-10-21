# Decision 0002: Chart state is derived, never synchronised

Date: 2026-10-21
Status: accepted

## Context

A chart has several things that can change independently: which streams exist, how they are arranged, which series fields are visible, and what data each stream holds. An imperative schema would maintain a mutable layout and update it when any of those change. That design fails in a predictable way: the layout and the data drift apart, and the chart renders a state that no longer matches the inputs.

## Decision

Chart state is derived from its inputs on read. There is no stored layout to keep in sync.

Three levels compose in order:

1. Provider layout fragments, which state where streams belong.
2. A default layout assembled from those fragments and the presenters.
3. A consumer overlay recording visibility and ordering changes.

The result is computed from live inputs each time it is read. A provider that disappears cannot leave a stale pane behind, because the pane is not stored anywhere.

## Alternatives rejected

- **Mutable layout with explicit add and remove calls.** Every caller must remember to update the layout when its data changes. The failure mode is silent and produces orphaned panes.
- **Storing the assembled state and diffing it against the inputs.** This reintroduces the synchronisation problem one level up, and requires a reconciliation pass before rendering.

## Consequences

- Correctness is structural: a stale chart state is not representable.
- Derivation cost is paid on read. For chart-sized inputs this is negligible, but it means work is repeated when several consumers read the state in one frame.
- Every derived group needs stable identity, because nothing else ties a computed group back to a consumer's logical series.
- The overlay must tolerate entries whose groups no longer exist. It does, by ignoring them rather than resurrecting them.
