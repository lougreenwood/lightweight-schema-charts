import { NotFoundError } from './errors/not-found-error.js';
import { ValidationError } from './errors/validation-error.js';
import { Result } from 'true-myth';

class CurrencyValue {
  /**
   * Build a CurrencyValue from a SerializedCurrencyValue and its associated AssetModel.
   *
   * Natural counterpart to the instance method `toSerializedCurrencyValue()`. The caller must resolve optional
   * `SerializedCurrencyValue` before invoking this method — the parameter is required.
   */
  static fromSerializedCurrencyValue({
    asset,
    serializedCurrencyValue
  }) {
    return new CurrencyValue({
      asset,
      value: BigInt(serializedCurrencyValue.value)
    });
  }

  /**
   * Resolve a SerializedCurrencyValue to a CurrencyValue by matching the embedded `assetId` against a list of candidate
   * assets.
   *
   * Centralizes the asset-matching + construction pattern that is duplicated across ~10 call sites. Each call site
   * provides its own candidate assets (from its relationship chain) and can `.mapErr()` the base error code to a
   * domain-specific one.
   *
   * @returns Result.ok with the constructed CurrencyValue, or Result.err when none of the candidate assets match the
   *   embedded assetId.
   */
  static resolveFromEmbedded({
    assets,
    embedded
  }) {
    const {
      assetId,
      value
    } = embedded;
    const asset = assets.find(a => a.id === assetId);
    if (asset === undefined) {
      return Result.err(NotFoundError.of({
        errorCode: 'CURRENCY_VALUE_ASSET_NOT_RESOLVED',
        message: `Asset ${assetId} not found among ${assets.length} candidate asset(s)`,
        meta: {
          assetId
        }
      }));
    }
    return Result.ok(new CurrencyValue({
      asset,
      value: BigInt(value)
    }));
  }
  asset;

  /**
   * Gets the currency value in its fixed-point representation, including decimal precision information.
   *
   * Used for base units like lamports, wei, or satoshis.
   *
   * @returns The currency value with decimal precision details
   */
  get fixed() {
    return {
      currency: this.#currency,
      decimalCurrency: this.#decimalCurrency,
      decimals: this.#decimals,
      value: this.#value
    };
  }

  /**
   * Gets the currency value in its floating-point representation, converting from the fixed-point base units using the
   * asset's decimal places.
   *
   * For example:
   *
   * - With 9 decimals: 1000000000 (fixed) -> 1.0 (float)
   * - With 6 decimals: 1000000 (fixed) -> 1.0 (float)
   *
   * @returns The currency value as a floating-point number with proper decimal places
   */
  get float() {
    return {
      currency: this.#currency,
      value: this.#toFloat(this.#value, this.#decimals)
    };
  }

  /**
   * @TODO: Consider handling additional value formats:
   * - Scientific notation (e.g. "1.23e-8")
   * - Different locale decimal separators (comma vs period)
   * - Values with trailing zeros after decimal (e.g. "1.500" vs "1.5")
   * - Values with leading zeros (e.g. "00001.5")
   * - Currency symbols or other non-numeric characters in strings
   */
  constructor({
    asset,
    value
  }) {
    this.#decimals = asset.decimals;
    this.#currency = asset.symbol;
    this.asset = asset;
    this.#decimalCurrency = asset.symbol;
    if (typeof value === 'bigint') {
      this.#value = value;
      return;
    }

    // Convert string to number if needed
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    // Always interpret any number (or numeric string) as a human-readable float.
    // Scale it to fixed-point using the asset's decimals.
    const scaled = numericValue * 10 ** this.#decimals;
    this.#value = BigInt(Math.round(scaled));
  }

  /**
   * Get a currency value by it's precision
   *
   * @param   precision The precision of the currency value
   *
   * @returns           The currency value
   */
  as(precision) {
    return this[precision];
  }
  convertTo(exchangeRate) {
    /**
     * Converts this currency value (the source) into a target currency using the provided exchange rate.
     *
     * The exchangeRate parameter represents the price of 1 unit of the source currency in the target currency. In
     * fixed-point terms:
     *
     * - Let source_fixed = this.#value and sourceDecimals = this.#decimals.
     * - The source floating-point value is source_fixed / 10^(sourceDecimals).
     * - The exchange rate's floating-point value is exchangeRate.fixed.value / 10^(exchangeRate.#decimals).
     *
     * The target floating-point amount is: target_float = (source_fixed / 10^(sourceDecimals)) *
     * (exchangeRate.fixed.value / 10^(exchangeRate.#decimals))
     *
     * To represent the target amount in fixed-point (using the target asset's decimals, assumed to be
     * exchangeRate.#decimals), we compute:
     *
     *     target_fixed = (source_fixed * exchangeRate.fixed.value) / (10 ^ sourceDecimals);
     *
     * This method uses integer arithmetic to perform the conversion without floating point imprecision.
     */
    const sourceDecimals = this.#decimals;
    const resultValue = this.#value * exchangeRate.fixed.value / 10n ** BigInt(sourceDecimals);
    const result = new CurrencyValue({
      asset: exchangeRate.asset,
      value: resultValue
    });
    return result;
  }

  /**
   * Calculates the price of the 'other' asset in terms of 'this' asset. E.g., if 'this' is USD and 'other' is BTC, it
   * calculates USD per BTC. The result is a CurrencyValue representing the price, associated with 'this' asset.
   *
   * Price (float) = this_amount / other_amount Price (fixed, in 'this' asset's decimals) = (this.fixed *
   * 10^other.decimals) / other.fixed
   *
   * @param   other The CurrencyValue representing the other asset amount (e.g., base amount).
   *
   * @returns       A Result containing a new CurrencyValue (associated with 'this' asset) representing the calculated
   *   price, or an Error.
   */
  getPriceOf(other) {
    if (other.fixed.value === 0n) {
      // Avoid division by zero if the 'other' amount is zero.
      // Returning zero price might be valid depending on context, but erroring is safer.
      return Result.err(ValidationError.of({
        errorCode: 'CURRENCY_VALUE_OTHER_AMOUNT_ZERO',
        message: 'Cannot calculate price relative to a zero amount',
        meta: {
          otherAssetId: other.asset.id
        }
      }));
    }
    // Price = this_amount / other_amount
    // Price (fixed, in this.asset terms) = (this.fixed * 10^other.decimals) / other.fixed
    const priceValue = this.fixed.value * 10n ** BigInt(other.asset.decimals) / other.fixed.value;
    // The resulting price is in terms of 'this' asset.
    return Result.ok(new CurrencyValue({
      asset: this.asset,
      value: priceValue
    }));
  }

  /**
   * Performs an inverse conversion.
   *
   * Given an exchange rate representing the price of 1 unit of the target asset in terms of the source asset, this
   * method converts the current value (interpreted as being in the source asset) into the corresponding amount in the
   * target asset.
   *
   * In other words, if exchangeRate represents "1 target = X source", then: target_value = (this_fixed *
   * 10^(target_decimals)) / exchangeRate.fixed.value
   *
   * @param   exchangeRate A CurrencyValue representing the conversion factor from target to source.
   *
   * @returns              A new CurrencyValue with the converted amount in the target asset.
   */
  inverseConvertTo(exchangeRate) {
    const targetDecimals = exchangeRate.asset.decimals;
    const resultValue = this.#value * 10n ** BigInt(targetDecimals) / exchangeRate.fixed.value;
    return new CurrencyValue({
      asset: exchangeRate.asset,
      value: resultValue
    });
  }
  toSerializedCurrencyValue() {
    return {
      assetId: this.asset.id,
      value: this.fixed.value.toString()
    };
  }
  #currency;
  #decimalCurrency;
  #decimals;
  #value;

  /**
   * Converts a decimal fixed-point BigInt to a floating point number. For decimal fixed-point, we don't need two's
   * complement handling since we're working with base-10 representation.
   *
   * @param   x        The fixed-point BigInt value
   * @param   decimals The number of decimal places
   *
   * @returns          The floating point representation
   */
  #toFloat(x, decimals) {
    const factor = 10n ** BigInt(decimals);
    return Number(x) / Number(factor);
  }
}

export { CurrencyValue as default };
//# sourceMappingURL=currency-value.js.map
