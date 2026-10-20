import type { NotFoundError } from '#src/vendor/shared-utils/errors/not-found-error';
import type { ValidationError } from '#src/vendor/shared-utils/errors/validation-error';

/**
 * Returned by `CurrencyValue.resolveFromEmbedded()` when none of the candidate assets match the embedded `assetId`.
 *
 * Call sites that need domain-specific error codes should `.mapErr()` to reclassify (e.g.,
 * `MARKET_DATA_SAMPLE_ASSET_NOT_FOUND`).
 */
export type CurrencyValueAssetNotResolvedError = NotFoundError<{
  errorCode: 'CURRENCY_VALUE_ASSET_NOT_RESOLVED';
  message: string;
  meta: { assetId: string };
}>;

export type CurrencyValueOtherAmountZeroValidationError = ValidationError<{
  errorCode: 'CURRENCY_VALUE_OTHER_AMOUNT_ZERO';
  message: string;
  meta: { otherAssetId: string };
}>;
