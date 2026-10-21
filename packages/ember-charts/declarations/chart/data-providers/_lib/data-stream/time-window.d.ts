import type { ObjectSchema } from '@warp-drive/core/types/schema/fields';
/**
 * Shared embedded TimeWindow schema for DataSamples.
 *
 * ObjectSchema (not a resource) - uses `identity: null` for referential identity.
 */
export declare const TimeWindowSchema: ObjectSchema;
export declare const TimeWindowUnboundedSchema: ObjectSchema;
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
export declare const schemas: ObjectSchema[];
//# sourceMappingURL=time-window.d.ts.map