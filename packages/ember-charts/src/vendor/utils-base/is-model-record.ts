import type { TypedRecordInstance } from '@warp-drive/core/types/record';
import type { WithLegacy } from '@warp-drive/legacy/model/migration-support';

import { recordIdentifierFor } from '@warp-drive/core';

export type ModelRecord = WithLegacy<TypedRecordInstance>;

export function isModelRecord(record: unknown): record is ModelRecord {
  try {
    return recordIdentifierFor(record as object) !== undefined;
  } catch {
    return false;
  }
}
