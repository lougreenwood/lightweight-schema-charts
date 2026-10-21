function decodeFilterValue({
  fieldType,
  operator,
  rawValue
}) {
  if (operator === 'isEmpty') {
    return {
      op: 'isEmpty',
      val: rawValue === 'true'
    };
  }
  const isArray = operator === 'in' || operator === 'between';
  if (operator === 'between') {
    const parts = decodeVal(rawValue, fieldType, true);
    const [first, second] = parts;
    return {
      op: 'between',
      val: [first, second]
    };
  }
  const val = isArray ? decodeVal(rawValue, fieldType, true) : decodeVal(rawValue, fieldType, false);
  return {
    op: operator,
    val
  };
}
function encodeFilterValue({
  value
}) {
  return encodeVal(value.val);
}
function decodeVal(rawValue, fieldType, isArray) {
  if (fieldType === 'date') {
    if (isArray) return rawValue.split(',').filter(Boolean).map(s => new Date(s));
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
function encodeVal(val) {
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(v => v instanceof Date ? v.toISOString() : String(v)).join(',');
  return String(val);
}

export { decodeFilterValue, encodeFilterValue };
//# sourceMappingURL=filter-value.js.map
