import type { FilterFieldType } from '#src/vendor/shared-utils/filtering/types';

export type BooleanFilter =
  ExistenceFilter | { readonly op: 'eq' | 'ne'; readonly val: boolean };

export type DateFilter =
  | ExistenceFilter
  | { readonly op: 'between'; readonly val: readonly [Date, Date] }
  | {
      readonly op: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne';
      readonly val: Date;
    }
  | { readonly op: 'in'; readonly val: readonly Date[] };

export type ExistenceFilter = { readonly op: 'isEmpty'; readonly val: boolean };

export type FilterValueFor<F extends FilterFieldType> = F extends 'date'
  ? DateFilter
  : F extends 'number'
    ? NumberFilter
    : F extends 'string'
      ? StringFilter
      : F extends 'boolean'
        ? BooleanFilter
        : F extends 'enum'
          ? StringFilter
          : F extends 'belongsTo'
            ? StringFilter
            : F extends 'hasMany'
              ? HasManyFilter
              : never;

export type HasManyFilter =
  | ExistenceFilter
  | { readonly op: 'allEq' | 'allNe'; readonly val: string }
  | { readonly op: 'eq' | 'in' | 'ne'; readonly val: string };

export type NumberFilter =
  | ExistenceFilter
  | { readonly op: 'between'; readonly val: readonly [number, number] }
  | {
      readonly op: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne';
      readonly val: number;
    }
  | { readonly op: 'in'; readonly val: readonly number[] };

export type StringFilter =
  | ExistenceFilter
  | {
      readonly op: 'contains' | 'endsWith' | 'eq' | 'ne' | 'startsWith';
      readonly val: string;
    }
  | { readonly op: 'in'; readonly val: readonly string[] };
