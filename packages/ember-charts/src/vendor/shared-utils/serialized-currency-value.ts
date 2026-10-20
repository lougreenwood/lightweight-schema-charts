/**
 * @module SerializedCurrencyValue
 *
 * Embedded shape for currency values stored directly within parent records.
 *
 * Used by MarketOrder, MarketTransaction, TradingStat, etc. for size/fee fields to avoid relationship overhead.
 *
 * This is the backend equivalent of frontend's `SerializedCurrencyValue` from
 * `app/schemas/serialized-currency-value/types.ts`.
 *
 * @see CurrencyValue for the full resource version
 */

/**
 * Embedded currency value shape.
 *
 * Used when currency values are stored directly within parent records rather than as separate relationships.
 */
export interface SerializedCurrencyValue {
  /**
   * Reference to the asset for decimal lookup.
   *
   * The parent record (e.g., MarketOrder) can use this to look up the asset from its TradableAssetPair relationship or
   * the store.
   */
  readonly assetId: string;

  /**
   * The amount as a string-encoded bigint in the asset's base units.
   *
   * Same semantics as CurrencyValue.amountFixed:
   *
   * - "1000000000" = 1.0 with 9 decimals
   * - "1500000000" = 1.5 with 9 decimals
   */
  readonly value: string;
}
