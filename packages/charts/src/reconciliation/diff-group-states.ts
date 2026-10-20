import type {
  DiffGroupStatesInput,
  GroupDiff,
  GroupSnapshot,
  GroupSnapshotInput,
  GroupSnapshotPair,
} from './diff-group-states/types.js';

/** Capture values, not live provider objects. Sorting does not mutate the caller's series. */
export function captureGroupSnapshot({
  dataState,
  dataStreamId,
  providerName,
  series,
  streamName,
}: GroupSnapshotInput): GroupSnapshot {
  return {
    cursor: dataState.cursor === undefined ? undefined : { ...dataState.cursor },
    dataHash: dataState.dataHash,
    dataLength: dataState.dataLength,
    dataStreamId,
    projectionId: dataState.projectionId,
    providerName,
    streamName,
    visibleFieldPaths: Array.from(series)
      .filter(({ visible }) => visible)
      .map(({ fieldPath }) => fieldPath)
      .sort(),
  };
}

/**
 * Compare snapshots keyed by caller-owned group IDs, including unchanged groups.
 * Empty maps produce an empty mathematical diff, not a missing-result signal.
 * The caller assembles group maps and captures fresh snapshots after applying changes.
 */
export function diffGroupStates({
  currentSnapshots,
  previousSnapshots,
}: DiffGroupStatesInput): ReadonlyMap<string, GroupDiff> {
  const diffs = currentSnapshots.entries().reduce((diffs, [groupId, current]) => {
    const previous = previousSnapshots.get(groupId);
    diffs.set(
      groupId,
      previous === undefined ? { namesChanged: false, structural: 'added' } : diffExistingGroup({ current, previous }),
    );
    return diffs;
  }, new Map<string, GroupDiff>());

  previousSnapshots
    .keys()
    .filter((groupId) => !currentSnapshots.has(groupId))
    .forEach((groupId) => diffs.set(groupId, { namesChanged: false, structural: 'removed' }));

  return diffs;
}

/**
 * Visibility rebuilds suppress a redundant rename flag. Otherwise names change independently.
 * Rebuild before incremental update: stream replacement, cursor loss, changed known projection,
 * empty-to-populated data, or cursor appearance. Cursor advance or changed known hash updates.
 * Cursor version, time regression, data shrink, and first-known hash/projection alone do nothing.
 */
function diffExistingGroup({ current, previous }: GroupSnapshotPair): GroupDiff {
  if (
    current.visibleFieldPaths.length !== previous.visibleFieldPaths.length ||
    current.visibleFieldPaths.some((fieldPath, index) => fieldPath !== previous.visibleFieldPaths[index])
  ) {
    return { dataChange: 'rebuilt', namesChanged: false };
  }

  const namesChanged = previous.providerName !== current.providerName || previous.streamName !== current.streamName;

  switch (true) {
    case previous.dataStreamId !== current.dataStreamId:
    case previous.cursor !== undefined && current.cursor === undefined:
    case previous.projectionId !== undefined &&
      current.projectionId !== undefined &&
      previous.projectionId !== current.projectionId:
    case (previous.dataLength === undefined || previous.dataLength === 0) &&
      current.dataLength !== undefined &&
      current.dataLength > 0:
    case previous.cursor === undefined && current.cursor !== undefined:
      return { dataChange: 'rebuilt', namesChanged };
    case previous.cursor !== undefined && current.cursor !== undefined && current.cursor.time > previous.cursor.time:
    case previous.dataHash !== undefined && current.dataHash !== undefined && previous.dataHash !== current.dataHash:
      return { dataChange: 'updated', namesChanged };
    default:
      return { namesChanged };
  }
}
