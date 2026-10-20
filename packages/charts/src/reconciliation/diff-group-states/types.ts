/** Plain progress metadata; time is epoch milliseconds. Version alone does not trigger an update. */
export type GroupCursor = Readonly<{
  time: number;
  version?: number;
}>;

export type GroupDataState = Readonly<{
  cursor: GroupCursor | undefined;
  dataHash: string | undefined;
  dataLength: number | undefined;
  projectionId: string | undefined;
}>;

/** Independent dimensions. Absent change fields mean no operation in that dimension. */
export type GroupDiff = Readonly<{
  dataChange?: 'rebuilt' | 'updated';
  namesChanged: boolean;
  structural?: 'added' | 'removed';
}>;

/** Capture with captureGroupSnapshot to obtain copied progress and sorted visible fields. */
export type GroupSnapshot = GroupDataState &
  Readonly<{
    dataStreamId: string;
    providerName: string;
    streamName: string;
    visibleFieldPaths: readonly string[];
  }>;

export type GroupSnapshotInput = Readonly<{
  dataState: GroupDataState;
  dataStreamId: string;
  providerName: string;
  series: Iterable<Readonly<{ fieldPath: string; visible: boolean }>>;
  streamName: string;
}>;

export type DiffGroupStatesInput = Readonly<{
  currentSnapshots: ReadonlyMap<string, GroupSnapshot>;
  previousSnapshots: ReadonlyMap<string, GroupSnapshot>;
}>;

export type GroupSnapshotPair = Readonly<{
  current: GroupSnapshot;
  previous: GroupSnapshot;
}>;
