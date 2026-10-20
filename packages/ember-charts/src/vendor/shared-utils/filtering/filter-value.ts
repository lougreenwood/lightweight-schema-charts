import type { FilterValueFor } from '#src/vendor/shared-utils/filtering/filter-value/types';
import type {
  FilterFieldType,
  FilterOperator,
} from '#src/vendor/shared-utils/filtering/types';

export function decodeFilterValue<F extends FilterFieldType>({
  fieldType,
  operator,
  rawValue,
}: {
  fieldType: F;
  operator: FilterOperator;
  rawValue: string;
}): FilterValueFor<F> {
  if (operator === 'isEmpty') {
    return {
      op: 'isEmpty',
      val: rawValue === 'true',
    } as unknown as FilterValueFor<F>;
  }

  const isArray = operator === 'in' || operator === 'between';

  if (operator === 'between') {
    const parts = decodeVal(rawValue, fieldType, true) as readonly (
      Date | number
    )[];
    const [first, second] = parts;

    return {
      op: 'between',
      val: [first, second],
    } as unknown as FilterValueFor<F>;
  }

  const val = isArray
    ? decodeVal(rawValue, fieldType, true)
    : decodeVal(rawValue, fieldType, false);

  return { op: operator, val } as unknown as FilterValueFor<F>;
}

export function encodeFilterValue<F extends FilterFieldType>({
  value,
}: {
  value: FilterValueFor<F>;
}): string {
  return encodeVal((value as { val: unknown }).val);
}

function decodeVal(
  rawValue: string,
  fieldType: FilterFieldType,
  isArray: boolean,
): unknown {
  if (fieldType === 'date') {
    if (isArray)
      return rawValue
        .split(',')
        .filter(Boolean)
        .map((s) => new Date(s));
    return new Date(rawValue);
  }
  if (fieldType === 'number') {
    if (isArray) return rawValue.split(',').filter(Boolean).map(Number);
    return Number(rawValue);
  }
  if (fieldType === 'boolean') {
    return rawValue === 'true';
  }
  if (isArray) return rawValue.split(',').filter(Boolean);
  return rawValue;
}

function encodeVal(val: unknown): string {
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val))
    return val
      .map((v) => (v instanceof Date ? v.toISOString() : String(v)))
      .join(',');
  return String(val);
}
