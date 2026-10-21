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

Before each reconcile, the modifier captures a snapshot per group:

- stream identity and projection identity
- cursor, sample count, and content hash
- provider and stream display names
- the sorted list of visible field paths

It then compares the previous snapshots with the current ones. The result is independent dimensions, not a single status:

| Dimension      | Values                       | Meaning                                   |
| -------------- | ---------------------------- | ----------------------------------------- |
| `structural`   | `added`, `removed`, absent   | Group appeared or disappeared             |
| `dataChange`   | `rebuilt`, `updated`, absent | Series must be rebuilt, or can be updated |
| `namesChanged` | boolean                      | Display names changed                     |

Absent means "nothing to do in this dimension". There is no separate "none" value, so a caller testing truthiness cannot mistake a no-op for a change.

### Rebuild before update

Rebuild wins whenever incremental updating would be wrong. In priority order:

1. The visible field set changed. The series shape changed, so it is rebuilt, and the rebuild already uses current names.
2. The stream identity changed. A different source cannot be appended to the old series.
3. The cursor disappeared. The provider regressed; appending would replay history.
4. The known projection identity changed. The values mean something different now.
5. The sample count went from empty or unknown to populated. The series was created empty and needs a full backfill.
6. The cursor appeared where there was none. Appending to an existing series would replay history.

Only when none of those hold does the diff consider an incremental update: the cursor advanced, or a known content hash changed with the same cursor.

Cases that deliberately do nothing: a cursor version change alone, a time regression, a shrinking count, a hash or projection identity that becomes known or unknown. Each would produce work without new data.

## Reconciliation

The modifier schedules work after render, then:

1. Processes removals first, so indices stay stable.
2. Adds new groups: reuse or create the pane, interpret projected values, then create the visible series and backfill. A failed interpretation creates no series.
3. Rebuilds changed groups: build the replacement first, then remove the old series and swap it in. A failed rebuild keeps the previous series.
4. Updates changed groups: fetch since the previous cursor, interpret, and push to the existing series.
5. Refreshes names when they changed or when pane-level labels changed.
6. Captures fresh snapshots for the next cycle, after applying.

A group whose interpretation fails is marked for backfill and retried on the next reconciliation cycle. The retry rebuilds the group from the provider; it does not leave a partial series in place.

Snapshots are captured after apply because that is the state the next cycle will compare against.

## Lifecycle

The chart is created once, on first reconciliation, and reused. Scheduled work is cancelled when the host is destroyed.

Teardown currently removes series and panes and cancels scheduled work. It does not dispose the chart instance. That is a known gap tracked in the roadmap: removing the host element removes the canvas but leaves the chart object alive.

## Related documents

- [Streams and samples](streams-and-samples.md)
- [Architecture overview](overview.md)
- [Roadmap](../../ROADMAP.md)
