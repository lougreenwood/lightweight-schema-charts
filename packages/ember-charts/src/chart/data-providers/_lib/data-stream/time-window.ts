import type { ObjectSchema } from '@warp-drive/core/types/schema/fields';

/**
 * Shared embedded TimeWindow schema for DataSamples.
 *
 * ObjectSchema (not a resource) - uses `identity: null` for referential identity.
 */
export const TimeWindowSchema: ObjectSchema = {
  identity: null,
  type: 'time-window',
  fields: [
    { kind: 'field', name: 'open', type: 'date' },
    { kind: 'field', name: 'close', type: 'date' },
  ],
};

export const TimeWindowUnboundedSchema: ObjectSchema = {
  identity: null,
  type: 'time-window-unbounded',
  fields: [
    { kind: 'field', name: 'open', type: 'date' },
    { kind: 'field', name: 'close', type: 'optional-date' },
  ],
};

export type TimeWindow = {
  close: Date;
  open: Date;
};

export type TimeWindowUnbounded = {
  /**
   * Close timestamp. Undefined for open-ended (active/unfinished) windows.
   */
  close: Date | undefined;
  open: Date;
};

export const schemas = [TimeWindowSchema, TimeWindowUnboundedSchema];
