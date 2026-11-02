/**
 * DiffGroupStates — Pure change detection for chart series groups.
 *
 * Compares previous-cycle snapshots against the current enriched groups from schema.state to produce a GroupDiff per
 * group. The adapter consumes these diffs to decide which LWC DOM operations to execute.
 *
 * Change detection is split into independent dimensions (structural, dataChange, namesChanged) so the adapter can
 * handle combinations correctly — e.g., a name change concurrent with a data append both get reported, and the adapter
 * decides which actions are redundant.
 *
 * First-sight logic: a group present in currentGroups but absent from previousSnapshots → structural: 'added'. No
 * guards requiring "both defined." No silent skips.
 */

import type { GroupDiff, GroupSnapshot } from './types';
import type { GroupId, SeriesGroupState, SeriesPath } from '../../schema/types';
import {
  findDescriptorWithParent,
  isCompleteLeafStructuralDescriptor,
} from '../../schema/utils';

/** Encode paths and rendering options without delimiter collisions. Names and data do not reset a terminal failure. */
export function captureSeriesConfiguration({
  group,
}: {
  group: SeriesGroupState;
}): string {
  return JSON.stringify(
    group.series
      .filter(({ visible }) => visible)
      .map(({ fieldPath }) => captureFieldConfiguration({ group, fieldPath }))
      .sort(([left = ''], [right = '']) => left.localeCompare(right)),
  );
}

function captureFieldConfiguration({
  group,
  fieldPath,
}: {
  group: SeriesGroupState;
  fieldPath: SeriesPath;
}): ReadonlyArray<string | undefined> {
  const found = findDescriptorWithParent({
    descriptors: group.presenter.structuralDescriptors,
    fieldPath,
  });
  if (
    found === undefined ||
    !isCompleteLeafStructuralDescriptor(found.descriptor)
  )
    return [fieldPath];
  return [
    fieldPath,
    found.descriptor.seriesKind,
    found.descriptor.valueHandler,
  ];
}

/**
 * Capture a GroupSnapshot from a SeriesGroupState for use in the next diff cycle.
 */
export function captureGroupSnapshot({
  group,
}: {
  group: SeriesGroupState;
}): GroupSnapshot {
  return {
    cursor:
      group.dataState.cursor === undefined
        ? undefined
        : { ...group.dataState.cursor },
    dataHash: group.dataState.dataHash,
    dataLength: group.dataState.dataLength,
    dataStreamId: group.dataStreamIdentifier.id,
    projectionId: group.dataState.projectionId,
    providerName: group.provider.name,
    streamName: group.presenter.streamName,
    seriesConfiguration: captureSeriesConfiguration({ group }),
  };
}

/**
 * Compare previous group snapshots against current enriched groups to produce per-group change descriptions.
 *
 * - Groups in currentGroups but not in previousSnapshots → structural: 'added'
 * - Groups in previousSnapshots but not in currentGroups → structural: 'removed'
 * - Groups in both → compare snapshot fields across independent dimensions
 */
export function diffGroupStates({
  currentGroups,
  previousSnapshots,
}: {
  currentGroups: ReadonlyMap<GroupId, SeriesGroupState>;
  previousSnapshots: ReadonlyMap<GroupId, GroupSnapshot>;
}): ReadonlyMap<GroupId, GroupDiff> {
  const diffs = new Map<GroupId, GroupDiff>();

  // Detect added and changed groups
  for (const [groupId, group] of currentGroups) {
    const previous = previousSnapshots.get(groupId);

    if (!previous) {
      diffs.set(groupId, { namesChanged: false, structural: 'added' });
      continue;
    }

    diffs.set(groupId, diffExistingGroup({ group, previous }));
  }

  // Detect removed groups
  for (const groupId of previousSnapshots.keys()) {
    if (!currentGroups.has(groupId)) {
      diffs.set(groupId, { namesChanged: false, structural: 'removed' });
    }
  }

  return diffs;
}

/**
 * Build a flat map of GroupId → SeriesGroupState from the enriched ChartState tree.
 */
export function flattenStateToGroupMap({
  panes,
}: {
  panes: ReadonlyArray<{ seriesGroups: ReadonlyArray<SeriesGroupState> }>;
}): ReadonlyMap<GroupId, SeriesGroupState> {
  return panes.values().reduce((map, pane) => {
    for (const group of pane.seriesGroups) {
      map.set(group.groupId, group);
    }
    return map;
  }, new Map<GroupId, SeriesGroupState>());
}

/**
 * Priority cascade for data changes. Returns the highest-priority kind, or undefined when nothing changed.
 *
 * P0 stream identity → rebuilt; P1 cursor disappeared → rebuilt; P2 projection identity → rebuilt; P3
 * empty-to-populated → rebuilt; P4 cursor appeared → rebuilt; P5 cursor advanced → updated; P6 content hash changed →
 * updated.
 */
function diffDataChange({
  group,
  previous,
}: {
  group: SeriesGroupState;
  previous: GroupSnapshot;
}): 'rebuilt' | 'updated' | undefined {
  const { dataState, dataStreamIdentifier } = group;

  // P0: data stream identity changed — underlying source replaced
  if (previous.dataStreamId !== dataStreamIdentifier.id) {
    return 'rebuilt';
  }

  // P1: cursor regression — had cursor, now undefined (provider replaced)
  if (previous.cursor !== undefined && dataState.cursor === undefined) {
    return 'rebuilt';
  }

  // P2: projectionId changed — indicator config rebuilt
  if (
    previous.projectionId !== undefined &&
    dataState.projectionId !== undefined &&
    previous.projectionId !== dataState.projectionId
  ) {
    return 'rebuilt';
  }

  // P3: indicator data arrived — was empty (0 or undefined), now has data.
  // The series was created with zero data points; needs full backfill.
  if (
    (previous.dataLength === undefined || previous.dataLength === 0) &&
    dataState.dataLength !== undefined &&
    dataState.dataLength > 0
  ) {
    return 'rebuilt';
  }

  // P4: missing previous cursor but current cursor exists — unsafe for incremental update.
  // Rebuild to avoid replaying historical points via series.update() on an existing series.
  if (previous.cursor === undefined && dataState.cursor !== undefined) {
    return 'rebuilt';
  }

  // P5: cursor advanced — new data points arrived
  if (
    previous.cursor !== undefined &&
    dataState.cursor !== undefined &&
    dataState.cursor.time > previous.cursor.time
  ) {
    return 'updated';
  }

  // P6: dataHash changed — latest bar content mutated
  if (
    dataState.dataHash !== undefined &&
    previous.dataHash !== undefined &&
    dataState.dataHash !== previous.dataHash
  ) {
    return 'updated';
  }

  return undefined;
}

/** Diff a group present in both snapshots, producing independent data-change and name-change dimensions. */
function diffExistingGroup({
  group,
  previous,
}: {
  group: SeriesGroupState;
  previous: GroupSnapshot;
}): GroupDiff {
  if (previous.seriesConfiguration !== captureSeriesConfiguration({ group })) {
    return {
      dataChange: 'rebuilt',
      namesChanged: false,
    };
  }

  const dataChange = diffDataChange({ group, previous });
  const namesChanged =
    previous.providerName !== group.provider.name ||
    previous.streamName !== group.presenter.streamName;

  return {
    ...(dataChange ? { dataChange } : {}),
    namesChanged,
  };
}
