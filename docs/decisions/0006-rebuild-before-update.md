# Decision 0006: Rebuild takes precedence over incremental update

Date: 2026-10-21
Status: accepted

## Context

A series can usually be updated in place: fetch the points after the last cursor and push them. That is cheap, and it is correct only when the new points continue the same series.

Several changes break that assumption. A different stream, a changed projection, a series that was created empty, or a cursor that disappeared all mean the existing series is not a prefix of the correct one. Updating in place would append points that belong to a different series, or replay history the chart already holds.

## Decision

Change detection produces independent dimensions, and rebuild is evaluated before update.

Rebuild when any of these hold, in priority order:

1. The visible field set changed.
2. The stream identity changed.
3. The cursor disappeared.
4. The known projection identity changed.
5. The sample count went from empty or unknown to populated.
6. The cursor appeared where there was none.

Only when none hold does an update apply: the cursor advanced, or a known content hash changed with the same cursor.

Cases that deliberately do nothing: a cursor version change alone, a time regression, a shrinking count, or a hash or projection identity that becomes known or unknown.

## Alternatives rejected

- **Always rebuild.** Simple and correct, but it discards the chart's viewport and animation state on every tick.
- **Always update.** Incorrect for every case above, and the failures are visually plausible, which makes them expensive to diagnose.
- **A single change status instead of dimensions.** Forces the caller to infer precedence, and loses combinations such as a rename that coincides with an update.

## Consequences

- Rebuild is more expensive but the safe default. A false rebuild costs a redraw; a false update corrupts the series.
- Visibility changes rebuild rather than update, because the series shape changed.
- Absent values are meaningful. A stream that never supplies a hash never takes the content-only update path; a stream that never supplies a count never takes the empty-to-populated rebuild path.
- The caller receives dimensions rather than a verdict, so it can decide that a rename accompanying a rebuild is redundant.
