import { InvariantViolationError } from '../../vendor/shared-utils/errors/invariant-violation-error.js';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error.js';
import { PreconditionError } from '../../vendor/shared-utils/errors/precondition-error.js';
import { UnavailableError } from '../../vendor/shared-utils/errors/unavailable-error.js';
import { ValidationError } from '../../vendor/shared-utils/errors/validation-error.js';

/**
 * Error when chart operations are attempted before the chart is mounted.
 *
 * This is a precondition error - the chart must be mounted via mount() before other operations can proceed.
 */

/**
 * Error when a descriptor's kind doesn't match what the operation expects.
 *
 * This indicates the descriptor was found but is the wrong type for the operation (e.g., trying to toggle a structural
 * field as a series field).
 */

/**
 * Error when a field descriptor is not found for the given path in a series group.
 *
 * This indicates the requested field path doesn't map to any descriptor in the presenter's schema.
 */

/**
 * Error when a series group should exist but doesn't (internal consistency violation).
 *
 * This indicates a logic bug where we expected a group to exist based on prior checks or state, but it's missing. This
 * should never occur in correct code.
 */

/**
 * Error when a series group is not found.
 *
 * This indicates the requested group ID doesn't exist in the chart schema.
 */

/**
 * Error when a pane should exist for a group but doesn't (internal consistency violation).
 *
 * This indicates a logic bug - if we have a seriesGroup, its parent pane should always exist. This should never occur
 * in correct code.
 */

/**
 * Error when a data provider is not found.
 *
 * This indicates the requested provider key doesn't exist in the provider registry.
 */

/**
 * Error when a data stream presenter is not found.
 *
 * This indicates the requested stream key doesn't have a presenter in the schema's presenter registry.
 */

/**
 * Error when a series field node is not found in a series group.
 *
 * This indicates the requested series field doesn't exist in the group's series map.
 */

/**
 * ChartSchemaStreamHiddenByConfigUnavailableError
 *
 * Returned when a data stream is intentionally hidden due to defaultVisibleFields configuration.
 *
 * This is not a failure - it's a discriminable condition indicating the stream was deliberately skipped because its
 * visibleFields set is empty. Callers can use the errorCode to distinguish this from actual errors.
 */

/**
 * Create a ChartSchemaChartNotMountedPreconditionError
 */
function createChartNotMountedError() {
  return PreconditionError.of({
    errorCode: 'CHART_SCHEMA_CHART_NOT_MOUNTED',
    message: 'Chart is not mounted. Call mount() first.'
  });
}

/**
 * Create a ChartSchemaDescriptorKindMismatchValidationError
 */
function createDescriptorKindMismatchError({
  actualKind,
  expectedKind
}) {
  return ValidationError.of({
    errorCode: 'CHART_SCHEMA_DESCRIPTOR_KIND_MISMATCH',
    message: `Descriptor kind mismatch: expected ${expectedKind}, got ${actualKind}`,
    meta: {
      actualKind,
      expectedKind
    }
  });
}

/**
 * Create a ChartSchemaFieldDescriptorNotFoundError
 */
function createFieldDescriptorNotFoundError({
  fieldPath,
  groupId
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_FIELD_DESCRIPTOR_NOT_FOUND',
    message: `Field descriptor not found for path ${fieldPath} in group ${groupId}`,
    meta: {
      fieldPath,
      groupId
    }
  });
}

/**
 * Create a ChartSchemaGroupInvariantViolationError
 */
function createGroupInvariantViolationError({
  context
}) {
  return InvariantViolationError.of({
    errorCode: 'CHART_SCHEMA_GROUP_INVARIANT_VIOLATED',
    message: `Group invariant violated: ${context}`,
    meta: {
      context
    }
  });
}

/**
 * Create a ChartSchemaGroupNotFoundError
 */
function createGroupNotFoundError({
  groupId
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_GROUP_NOT_FOUND',
    message: `Group not found: ${groupId}`,
    meta: {
      groupId
    }
  });
}

/**
 * Create a ChartSchemaPaneInvariantViolationError
 */
function createPaneInvariantViolationError({
  groupId
}) {
  return InvariantViolationError.of({
    errorCode: 'CHART_SCHEMA_PANE_INVARIANT_VIOLATED',
    message: `Parent pane not found for group ${groupId}`,
    meta: {
      groupId
    }
  });
}

/**
 * Create a ChartSchemaProviderNotFoundError
 */
function createProviderNotFoundError({
  providerId
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_PROVIDER_NOT_FOUND',
    message: `Provider not found: ${providerId}`,
    meta: {
      providerId
    }
  });
}

/**
 * Create a ChartSchemaPresenterNotFoundError
 */
function createPresenterNotFoundError({
  streamKey
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_PRESENTER_NOT_FOUND',
    message: `Presenter not found for stream: ${streamKey}`,
    meta: {
      streamKey
    }
  });
}

/**
 * Create a ChartSchemaSeriesNodeNotFoundError
 */
function createSeriesNodeNotFoundError({
  groupId,
  seriesId
}) {
  return NotFoundError.of({
    errorCode: 'CHART_SCHEMA_SERIES_FIELD_NODE_NOT_FOUND',
    message: `Series field node not found: ${seriesId} in group ${groupId}`,
    meta: {
      groupId,
      seriesId
    }
  });
}

/**
 * Create a ChartSchemaStreamHiddenByConfigUnavailableError
 */
function createStreamHiddenByConfigError({
  dataStreamIdentifier
}) {
  return UnavailableError.of({
    errorCode: 'CHART_SCHEMA_STREAM_HIDDEN_BY_CONFIG',
    message: `Stream hidden by config: ${dataStreamIdentifier.id}`,
    meta: {
      dataStreamIdentifier
    }
  });
}

export { createChartNotMountedError, createDescriptorKindMismatchError, createFieldDescriptorNotFoundError, createGroupInvariantViolationError, createGroupNotFoundError, createPaneInvariantViolationError, createPresenterNotFoundError, createProviderNotFoundError, createSeriesNodeNotFoundError, createStreamHiddenByConfigError };
//# sourceMappingURL=errors.js.map
