import { recordIdentifierFor } from '@warp-drive/core';

function isModelRecord(record) {
  try {
    return recordIdentifierFor(record) !== undefined;
  } catch {
    return false;
  }
}

export { isModelRecord };
//# sourceMappingURL=is-model-record.js.map
