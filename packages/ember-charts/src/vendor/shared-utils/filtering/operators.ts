import type { FilterFieldType } from './types';

/**
 * Map of filter field type to supported operator strings.
 *
 * Used by both backend (operator validation, descriptor building) and frontend (operator dropdown options, URL
 * parameter encoding). This is the single source of truth — do not duplicate this mapping elsewhere.
 *
 * The returned array order matches the preferred display order (most common first).
 */
const OPERATORS_BY_TYPE: Readonly<Record<FilterFieldType, readonly string[]>> =
  {
    belongsTo: ['eq', 'ne', 'in', 'isEmpty'],
    boolean: ['eq', 'ne', 'isEmpty'],
    date: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'between', 'isEmpty'],
    enum: ['eq', 'ne', 'in', 'isEmpty'],
    hasMany: ['eq', 'ne', 'in', 'allEq', 'allNe', 'isEmpty'],
    number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'between', 'isEmpty'],
    string: ['eq', 'ne', 'contains', 'startsWith', 'endsWith', 'in', 'isEmpty'],
  } as const;

/**
 * Get the operator list for a given filter field type.
 *
 * @param   type - The filter field type (e.g. `'number'`, `'string'`)
 *
 * @returns      The operator list for that type — every operator name that is valid for the given field type.
 */
export function getOperatorsForType(type: FilterFieldType): readonly string[] {
  return OPERATORS_BY_TYPE[type];
}
