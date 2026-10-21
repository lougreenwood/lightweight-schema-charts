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
import type { GroupId, SeriesGroupState } from '../../schema/types';
/**
 * Capture a GroupSnapshot from a SeriesGroupState for use in the next diff cycle.
 */
export declare function captureGroupSnapshot({ group, }: {
    group: SeriesGroupState;
}): GroupSnapshot;
/**
 * Compare previous group snapshots against current enriched groups to produce per-group change descriptions.
 *
 * - Groups in currentGroups but not in previousSnapshots → structural: 'added'
 * - Groups in previousSnapshots but not in currentGroups → structural: 'removed'
 * - Groups in both → compare snapshot fields across independent dimensions
 */
export declare function diffGroupStates({ currentGroups, previousSnapshots, }: {
    currentGroups: ReadonlyMap<GroupId, SeriesGroupState>;
    previousSnapshots: ReadonlyMap<GroupId, GroupSnapshot>;
}): ReadonlyMap<GroupId, GroupDiff>;
/**
 * Build a flat map of GroupId → SeriesGroupState from the enriched ChartState tree.
 */
export declare function flattenStateToGroupMap({ panes, }: {
    panes: ReadonlyArray<{
        seriesGroups: ReadonlyArray<SeriesGroupState>;
    }>;
}): ReadonlyMap<GroupId, SeriesGroupState>;
//# sourceMappingURL=diff-group-states.d.ts.map