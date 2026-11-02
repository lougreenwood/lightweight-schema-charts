# Composition and reconciliation

Chart state is derived, then reconciled. Nothing copies it into a second mutable structure.

## Composition

Three levels, applied in order:

1. **Layout fragments.** Each provider declares a fragment: panes, and within them stream-type groups with empty series arrays. A fragment says where streams should appear, not what they contain.
2. **Default layout.** The schema assembles fragments into a full layout, resolves each group to a live stream, and fills its series from the presenter's descriptors and default visible fields. Groups whose streams no longer exist are dropped.
3. **Actual layout.** The consumer's overlay applies visibility and ordering. A schema exposes `toggleSeries` for this, and the overlay can be persisted and restored.

The result is a read-only tree: panes contain groups, groups contain visible series fields. Groups without a visible field are omitted, so an all-hidden group does not render.

### Group identity

Every group carries a stable identity supplied by its provider. That identity is the key for layout persistence, for diffing across cycles, and for matching a persisted overlay to a live stream. The package never invents it.

## Change detection

After each reconcile, the modifier captures a snapshot per group for the next comparison:

- stream identity and projection identity
- cursor, sample count, and content hash
- provider and stream display names
- an unambiguous encoding of visible field paths, series kinds, and handler identifiers

It then compares the previous snapshots with the current ones. The result is independent dimensions, not a single status:

| Dimension      | Values                       | Meaning                                   |
| -------------- | ---------------------------- | ----------------------------------------- |
| `structural`   | `added`, `removed`, absent   | Group appeared or disappeared             |
| `dataChange`   | `rebuilt`, `updated`, absent | Series must be rebuilt, or can be updated |
| `namesChanged` | boolean                      | Display names changed                     |

Absent means "nothing to do in this dimension". There is no separate "none" value, so a caller testing truthiness cannot mistake a no-op for a change.

### Rebuild before update

Rebuild wins whenever incremental updating would be wrong. In priority order:

1. The visible field configuration changed. Paths, series kinds, and handler identifiers determine the rendering shape. A replacement registry also rebuilds existing groups.
2. The stream identity changed. A different source cannot be appended to the old series.
3. The cursor disappeared. The provider regressed; appending would replay history.
4. The known projection identity changed. The values mean something different now.
5. The sample count went from empty or unknown to populated. The series was created empty and needs a full backfill.
6. The cursor appeared where there was none. Appending to an existing series would replay history.

Only when none of those hold does the diff consider an incremental update: the cursor advanced, or a known content hash changed with the same cursor.

Cases that deliberately do nothing: a cursor version change alone, a time regression, a shrinking count, a hash or projection identity that becomes known or unknown. Each would produce work without new data.

## Reconciliation

The modifier schedules work after render, then:

1. Retries or resumes groups from the previous failure map. A group blocked by a missing adapter is skipped unless its registry or visible configuration changed.
2. Processes removals, then refreshes pane-index keys, because Lightweight Charts renumbers later panes after a pane is removed.
3. Adds new groups: reuse or create the pane, interpret projected values, then create the visible series and backfill. A failed interpretation creates no series.
4. Rebuilds changed groups: build the replacement first, then remove the old series and swap it in. A failed rebuild keeps the previous series.
5. Updates changed groups: fetch since the previous cursor, interpret all visible fields, then push to the existing series only if every field succeeded.
6. Refreshes names when they changed or when pane-level labels changed.
7. Captures fresh snapshots for the next cycle, after applying.

A transient fetch/value failure marks the group for full backfill on the next reconciliation. A missing adapter instead blocks the group until the registry or visible descriptor configuration changes. Both states use one retry map. Removing a group clears its failure state. `onError` reports missing-adapter and value failures as `ChartRenderFailure`, without raw values.

Initial failures leave no partial group. Rejected updates and rebuilds retain previous history. Pane removals refresh the live index keys before routing additions, because Lightweight Charts renumbers later panes.

Snapshots copy the cursor rather than aliasing consumer state. Failed attempts are still captured; the retry map ensures the next reconciliation backfills missed history.

## Lifecycle

The chart is created once, on first reconciliation, and reused. Scheduled work is cancelled when the host is destroyed.

One destructor cancels scheduled work before disposing the chart instance. It does not rely on ordering between separate destructors. Disposal is idempotent; removing the host element also removes the canvas.

A zero-size host uses the same chart and the existing automatic-size observer. It recovers when the host becomes visible; no second resize mechanism is installed. Initial focus waits until samples exist.

## Related documents

- [Streams and samples](streams-and-samples.md)
- [Architecture overview](overview.md)
- [Roadmap](../../ROADMAP.md)
