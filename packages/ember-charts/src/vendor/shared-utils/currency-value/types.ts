export interface CurrencyValueFixedPoint extends CurrencyValueBase {
  decimalCurrency: string;
  decimals: number;
}

export type CurrencyValueFloatingPoint = Omit<CurrencyValueBase, 'value'> & {
  value: number;
};

export type CurrencyValuePrecision = 'fixed' | 'float';

export type CurrencyValueRepresentation =
  CurrencyValueFixedPoint | CurrencyValueFloatingPoint;

export type RawCurrencyValue = bigint | number;

interface CurrencyValueBase {
  currency: string;
  value: bigint;
}
