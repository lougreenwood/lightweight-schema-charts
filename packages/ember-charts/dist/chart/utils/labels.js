import { isBranchStructuralDescriptor } from '../schema/utils.js';
import startCase from 'lodash-es/startCase';

/**
 * Label Utilities
 *
 * Provides utility functions for generating labels for chart series and panes. Implements redundancy removal logic to
 * create clean, readable labels from hierarchical data structure (Provider → Stream → Field).
 *
 * Key functions:
 *
 * - BuildSeriesLabel: Generate full hierarchical label with redundancy removal
 * - BuildSeriesTitle: Generate abbreviated title for native series title property
 * - BuildPaneLabel: Generate pane label with special handling for first pane
 */


/**
 * BuildPaneLabelArgs
 *
 * Arguments for building a pane label.
 */

/**
 * BuildSeriesLabelArgs
 *
 * Arguments for building a series label.
 */

/**
 * BuildSeriesTitleArgs
 *
 * Arguments for building a series title (abbreviated).
 */

/**
 * Build a pane label with special handling for the first pane.
 *
 * First pane pattern: {TradableAssetPairName} | {SeriesLabel} [timeframe] Other panes pattern: {SeriesLabel}
 * [timeframe]
 *
 * Examples:
 *
 * - First pane: "WETH/USDC - Uniswap V2 | MarketDataData - ohlc [1m]"
 * - Other panes: "MyStrategy - macd [5m]"
 */
function buildPaneLabel(args) {
  const seriesLabel = buildSeriesLabel({
    fieldDescriptor: args.fieldDescriptor,
    parentDescriptor: args.parentDescriptor,
    providerName: args.providerName,
    streamType: args.streamType
  });
  let label;
  if (args.isFirstPane && args.tradableAssetPairName) {
    label = `${args.tradableAssetPairName} | ${seriesLabel}`;
  } else {
    label = seriesLabel;
  }

  // Append timeframe in brackets if provided
  if (args.timeframeLabel) {
    label = `${label} [${args.timeframeLabel}]`;
  }
  return label;
}

/**
 * Build a full hierarchical series label with redundancy removal.
 *
 * Pattern: {ProviderName} - {StreamType} - {FieldLabel} with redundancy removal applied. For structural field children,
 * combines parent and child as "Parent > Child".
 *
 * Examples:
 *
 * - MarketDataData - ohlc (was: MarketDataData - ohlc - OHLC)
 * - MarketDataData - Volume > Buy (for faceted volume.buy)
 * - MarketDataData - Traders > Total (for faceted traders.total)
 * - MyStrategy - EMA (was: MyStrategy - ema - EMA)
 * - MyStrategy - macd - Histogram (was: MyStrategy - macd - MACD - Histogram)
 */
function buildSeriesLabel(args) {
  const fieldLabel = args.fieldDescriptor.label || inferFieldLabelFromPath(args.fieldDescriptor.identifier.fieldPath);
  const parentLabel = args.parentDescriptor?.label;

  // If this is a child of a structural field, combine parent and child
  const isStructuralChild = parentLabel && args.parentDescriptor && isBranchStructuralDescriptor(args.parentDescriptor);
  const combinedFieldLabel = isStructuralChild ? `${parentLabel} > ${fieldLabel}` : fieldLabel;
  const components = removeRedundancy({
    fieldLabel: combinedFieldLabel,
    parentLabel: isStructuralChild ? parentLabel : undefined,
    providerName: args.providerName,
    streamType: args.streamType
  });
  return components.join(' - ');
}

/**
 * Build an abbreviated series title for the native LightweightCharts title property.
 *
 * Rules:
 *
 * - Structural field children: Use "Parent > Child" format (e.g., "Volume > Buy", "Trades > Total")
 * - Non-structural fields: Use the field label (e.g., "OHLC", "EMA 20")
 *
 * Examples:
 *
 * - "OHLC"
 * - "EMA 20"
 * - "Volume > Buy" (for volume.buy)
 * - "Traders > Total" (for traders.total)
 */
function buildSeriesTitle(args) {
  const childLabel = args.fieldDescriptor.label || inferFieldLabelFromPath(args.fieldDescriptor.identifier.fieldPath);

  // If this is a child of a structural field, use "Parent > Child" format
  if (args.parentDescriptor && isBranchStructuralDescriptor(args.parentDescriptor)) {
    const parentLabel = args.parentDescriptor.label || inferFieldLabelFromPath(args.parentDescriptor.identifier.fieldPath);
    return `${parentLabel} > ${childLabel}`;
  }

  // Otherwise use the field label as-is
  return childLabel;
}

/**
 * Extract stream type from a data stream identifier.
 */
function getStreamTypeFromIdentifier(identifier) {
  return identifier.type;
}

/**
 * Extract provider name from a data provider identifier.
 *
 * For now, this uses the provider type. In the future, we might want to use a more descriptive name from the provider
 * instance itself.
 */

function humanizeChartFieldLabel({
  fieldName
}) {
  return startCase(fieldName);
}

/**
 * Infer a field label from its path when no explicit label is provided.
 *
 * Examples:
 *
 * - Data.fooBar → Foo Bar
 * - Data.ohlc → OHLC
 * - Meta.timestamp → Timestamp
 */
function inferFieldLabelFromPath(fieldPath) {
  // Extract the field name after 'data.' or 'meta.'
  const parts = fieldPath.split('.');
  const fieldName = parts[parts.length - 1];
  if (!fieldName) {
    return '';
  }
  return humanizeChartFieldLabel({
    fieldName
  });
}

/**
 * Check if two strings are exactly equal (case-insensitive)
 */
function isExactMatch(a, b) {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

/**
 * Normalize text for comparison (case-insensitive, trimmed)
 */
function normalizeForComparison(text) {
  return text.trim().toLowerCase();
}

/**
 * Remove redundancy from label components according to the task specification.
 *
 * Rules:
 *
 * 1. If streamType and fieldLabel are identical, drop streamType (only include fieldLabel)
 * 2. If parentLabel matches streamType (for structural children), drop streamType (fieldLabel already includes "Parent >
 *    Child")
 * 3. Otherwise include all non-redundant components
 */
function removeRedundancy(args) {
  const components = [args.providerName];

  // Check if stream type matches field label (case-insensitive exact match)
  const streamTypeMatchesField = isExactMatch(args.streamType, args.fieldLabel);

  // For structural children with "Parent > Child" format, check if parent matches stream type
  const parentMatchesStreamType = args.parentLabel ? isExactMatch(args.parentLabel, args.streamType) : false;

  // Build the component list based on redundancy rules
  if (streamTypeMatchesField) {
    // Rule 1: Stream type and field label are identical
    // Include only: Provider - Field
    components.push(args.fieldLabel);
  } else if (parentMatchesStreamType) {
    // Rule 2: Parent matches stream type (for structural children)
    // Include only: Provider - Field (where Field is "Parent > Child")
    components.push(args.fieldLabel);
  } else {
    // No redundancy
    // Include: Provider - StreamType - Field
    components.push(args.streamType);
    components.push(args.fieldLabel);
  }
  return components;
}

export { buildPaneLabel, buildSeriesLabel, buildSeriesTitle, getStreamTypeFromIdentifier, humanizeChartFieldLabel };
//# sourceMappingURL=labels.js.map
