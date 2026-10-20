/**
 * Canonical filter field types shared between backend serialization and frontend filter UI.
 *
 * These types define the complete set of field types and operators supported by the filter/sort system. They live in
 * shared-utils so both backend (for operator derivation and request validation) and frontend (for operator dropdown
 * types and URL parameter typing) use the same contract without duplicating the union definition.
 */

/**
 * All filterable/sortable field types.
 *
 * Each type determines which operators are available and how the filter UI renders.
 */
export type FilterFieldType =
  'belongsTo' | 'boolean' | 'date' | 'enum' | 'hasMany' | 'number' | 'string';

/**
 * All supported filter operators.
 *
 * The backend applies these via `applyOperator` (RQB) or raw SQL (hasMany). The frontend uses them for operator
 * selection UI and bracket-notation URL parameter encoding.
 */
export type FilterOperator =
  | 'allEq'
  | 'allNe'
  | 'between'
  | 'contains'
  | 'endsWith'
  | 'eq'
  | 'gt'
  | 'gte'
  | 'in'
  | 'isEmpty'
  | 'lt'
  | 'lte'
  | 'ne'
  | 'startsWith';

/**
 * Per-type operator tuples — maps each FilterFieldType to the exact set of operators that are valid for that type. Used
 * at both type level (for discriminated union variants) and runtime (via getOperatorsForType).
 */
export type OperatorsForType<T extends FilterFieldType> = T extends 'boolean'
  ? readonly ['eq', 'ne', 'isEmpty']
  : T extends 'date' | 'number'
    ? readonly [
        'eq',
        'ne',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'between',
        'isEmpty',
      ]
    : T extends 'string'
      ? readonly [
          'eq',
          'ne',
          'contains',
          'startsWith',
          'endsWith',
          'in',
          'isEmpty',
        ]
      : T extends 'enum'
        ? readonly ['eq', 'ne', 'in', 'isEmpty']
        : T extends 'belongsTo'
          ? readonly ['eq', 'ne', 'in', 'isEmpty']
          : T extends 'hasMany'
            ? readonly ['eq', 'ne', 'in', 'allEq', 'allNe', 'isEmpty']
            : never;
