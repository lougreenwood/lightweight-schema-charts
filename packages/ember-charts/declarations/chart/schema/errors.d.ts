import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { GroupId, SeriesPath, SeriesId } from './types';
import { InvariantViolationError } from '../../vendor/shared-utils/errors/invariant-violation-error';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error';
import { PreconditionError } from '../../vendor/shared-utils/errors/precondition-error';
import { UnavailableError } from '../../vendor/shared-utils/errors/unavailable-error';
import { ValidationError } from '../../vendor/shared-utils/errors/validation-error';
/**
 * Error when chart operations are attempted before the chart is mounted.
 *
 * This is a precondition error - the chart must be mounted via mount() before other operations can proceed.
 */
export type ChartSchemaChartNotMountedPreconditionError = PreconditionError<{
    errorCode: 'CHART_SCHEMA_CHART_NOT_MOUNTED';
    message: string;
}>;
/**
 * Error when a descriptor's kind doesn't match what the operation expects.
 *
 * This indicates the descriptor was found but is the wrong type for the operation (e.g., trying to toggle a structural
 * field as a series field).
 */
export type ChartSchemaDescriptorKindMismatchValidationError = ValidationError<{
    errorCode: 'CHART_SCHEMA_DESCRIPTOR_KIND_MISMATCH';
    message: string;
    meta: {
        actualKind: string;
        expectedKind: 'series' | 'structural';
    };
}>;
/**
 * Error when a field descriptor is not found for the given path in a series group.
 *
 * This indicates the requested field path doesn't map to any descriptor in the presenter's schema.
 */
export type ChartSchemaFieldDescriptorNotFoundError = NotFoundError<{
    errorCode: 'CHART_SCHEMA_FIELD_DESCRIPTOR_NOT_FOUND';
    message: string;
    meta: {
        fieldPath: SeriesPath;
        groupId: GroupId;
    };
}>;
/**
 * Error when a series group should exist but doesn't (internal consistency violation).
 *
 * This indicates a logic bug where we expected a group to exist based on prior checks or state, but it's missing. This
 * should never occur in correct code.
 */
export type ChartSchemaGroupInvariantViolationError = InvariantViolationError<{
    errorCode: 'CHART_SCHEMA_GROUP_INVARIANT_VIOLATED';
    message: string;
    meta: {
        context: string;
    };
}>;
/**
 * Error when a series group is not found.
 *
 * This indicates the requested group ID doesn't exist in the chart schema.
 */
export type ChartSchemaGroupNotFoundError = NotFoundError<{
    errorCode: 'CHART_SCHEMA_GROUP_NOT_FOUND';
    message: string;
    meta: {
        groupId: string;
    };
}>;
/**
 * Error when a pane should exist for a group but doesn't (internal consistency violation).
 *
 * This indicates a logic bug - if we have a seriesGroup, its parent pane should always exist. This should never occur
 * in correct code.
 */
export type ChartSchemaPaneInvariantViolationError = InvariantViolationError<{
    errorCode: 'CHART_SCHEMA_PANE_INVARIANT_VIOLATED';
    message: string;
    meta: {
        groupId: GroupId;
    };
}>;
/**
 * Error when a data provider is not found.
 *
 * This indicates the requested provider key doesn't exist in the provider registry.
 */
export type ChartSchemaProviderNotFoundError = NotFoundError<{
    errorCode: 'CHART_SCHEMA_PROVIDER_NOT_FOUND';
    message: string;
    meta: {
        providerId: string;
    };
}>;
/**
 * Error when a data stream presenter is not found.
 *
 * This indicates the requested stream key doesn't have a presenter in the schema's presenter registry.
 */
export type ChartSchemaPresenterNotFoundError = NotFoundError<{
    errorCode: 'CHART_SCHEMA_PRESENTER_NOT_FOUND';
    message: string;
    meta: {
        streamKey: string;
    };
}>;
/**
 * Error when a series field node is not found in a series group.
 *
 * This indicates the requested series field doesn't exist in the group's series map.
 */
export type ChartSchemaSeriesNodeNotFoundError = NotFoundError<{
    errorCode: 'CHART_SCHEMA_SERIES_FIELD_NODE_NOT_FOUND';
    message: string;
    meta: {
        groupId: GroupId;
        seriesId: SeriesId;
    };
}>;
/**
 * ChartSchemaStreamHiddenByConfigUnavailableError
 *
 * Returned when a data stream is intentionally hidden due to defaultVisibleFields configuration.
 *
 * This is not a failure - it's a discriminable condition indicating the stream was deliberately skipped because its
 * visibleFields set is empty. Callers can use the errorCode to distinguish this from actual errors.
 */
export type ChartSchemaStreamHiddenByConfigUnavailableError = UnavailableError<{
    errorCode: 'CHART_SCHEMA_STREAM_HIDDEN_BY_CONFIG';
    message: string;
    meta: {
        dataStreamIdentifier: DataStreamIdentifier;
    };
}>;
/**
 * Create a ChartSchemaChartNotMountedPreconditionError
 */
export declare function createChartNotMountedError(): ChartSchemaChartNotMountedPreconditionError;
/**
 * Create a ChartSchemaDescriptorKindMismatchValidationError
 */
export declare function createDescriptorKindMismatchError({ actualKind, expectedKind, }: {
    actualKind: string;
    expectedKind: 'series' | 'structural';
}): ChartSchemaDescriptorKindMismatchValidationError;
/**
 * Create a ChartSchemaFieldDescriptorNotFoundError
 */
export declare function createFieldDescriptorNotFoundError({ fieldPath, groupId, }: {
    fieldPath: SeriesPath;
    groupId: GroupId;
}): ChartSchemaFieldDescriptorNotFoundError;
/**
 * Create a ChartSchemaGroupInvariantViolationError
 */
export declare function createGroupInvariantViolationError({ context, }: {
    context: string;
}): ChartSchemaGroupInvariantViolationError;
/**
 * Create a ChartSchemaGroupNotFoundError
 */
export declare function createGroupNotFoundError({ groupId, }: {
    groupId: string;
}): ChartSchemaGroupNotFoundError;
/**
 * Create a ChartSchemaPaneInvariantViolationError
 */
export declare function createPaneInvariantViolationError({ groupId, }: {
    groupId: GroupId;
}): ChartSchemaPaneInvariantViolationError;
/**
 * Create a ChartSchemaProviderNotFoundError
 */
export declare function createProviderNotFoundError({ providerId, }: {
    providerId: string;
}): ChartSchemaProviderNotFoundError;
/**
 * Create a ChartSchemaPresenterNotFoundError
 */
export declare function createPresenterNotFoundError({ streamKey, }: {
    streamKey: string;
}): ChartSchemaPresenterNotFoundError;
/**
 * Create a ChartSchemaSeriesNodeNotFoundError
 */
export declare function createSeriesNodeNotFoundError({ groupId, seriesId, }: {
    groupId: GroupId;
    seriesId: SeriesId;
}): ChartSchemaSeriesNodeNotFoundError;
/**
 * Create a ChartSchemaStreamHiddenByConfigUnavailableError
 */
export declare function createStreamHiddenByConfigError({ dataStreamIdentifier, }: {
    dataStreamIdentifier: DataStreamIdentifier;
}): ChartSchemaStreamHiddenByConfigUnavailableError;
//# sourceMappingURL=errors.d.ts.map