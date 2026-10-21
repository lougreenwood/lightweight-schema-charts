# Compose panes and visibility

Layout has three levels, applied in order. Understanding which level owns a decision prevents most layout bugs.

## 1. Provider fragments

Each provider declares where its streams belong:

```ts
defaultLayout: {
  panes: [
    {
      seriesGroups: [
        { groupId: 'synthetic::candlestick', series: [], stableLayoutKey: 'synthetic', streamType: 'candlestick' },
      ],
    },
  ],
}
```

A fragment never lists series. It states pane membership and stream type only; the schema fills fields from the presenter.

Group several related streams into one pane when they share a scale, such as a price and its moving average. Otherwise leave the default: one pane per stream.

## 2. Assembled default layout

The schema builds the default layout by:

1. Taking each provider's fragment.
2. Resolving each group to a live stream.
3. Filling series from the presenter's descriptors, marking `defaultSeries` visible.
4. Applying `groupIdFor` so the group has stable identity.
5. Dropping groups whose stream no longer exists.

This level is derived on demand. Nothing writes it back, so a provider appearing or disappearing cannot leave stale panes behind.

## 3. Consumer overlay

The overlay records what the user changed: visibility and ordering. The schema exposes `toggleSeries` for visibility, and the overlay can be persisted and restored across sessions.

```ts
schema.toggleSeries({ identifier: { groupId, fieldPath } });
```

The overlay is applied last, so it wins over defaults. A persisted overlay referring to a group that no longer exists is ignored rather than resurrecting it.

## What triggers a rebuild

Visibility is part of the snapshot. When the visible field set changes, the affected series is rebuilt rather than updated, because its shape changed. That is deliberate: updating a series whose fields changed produces mismatched points.

The rebuild suppresses a redundant rename, so a visibility change does not also trigger a title refresh.

## Practical rules

- Keep fragments minimal: panes and stream types, nothing else.
- Give each group a stable identity that survives reconfiguration.
- Do not attempt to reorder panes inside a fragment; ordering belongs to the overlay.
- If a group should be permanently hidden, omit it from `defaultSeries` rather than hiding it after assembly.
- Treat the assembled state as read-only. Mutating it does not persist and will be overwritten on the next derivation.
