import { getCssVar } from '../../vendor/utils-base/css-color-utils.js';

/**
 * Chart Theme
 *
 * Provides lightweight-charts theme options derived from CSS variables. This allows the chart to automatically adapt to
 * whatever Frontile theme is active.
 *
 * Since lightweight-charts renders to canvas, it cannot use CSS variables directly. This utility reads the computed CSS
 * variable values at runtime and returns a configuration object compatible with lightweight-charts.
 *
 * IMPORTANT: lightweight-charts only supports hex/rgb/rgba colors, not oklch(). We must convert all CSS variable values
 * to hex format before passing to the chart library.
 *
 * Usage:
 *
 * ```ts
 * import { getChartTheme } from "./chart-theme";
 *
 * const chart = createChart(element, {
 *   ...getChartTheme(),
 *   // other options...
 * });
 * ```
 */


/**
 * CSS variable names used by Frontile themes. These are set on :root by the active theme.
 */
const CSS_VARS = {
  // Backgrounds
  background: '--color-background',
  brand: '--color-brand',
  danger: '--color-danger',
  // Borders/dividers
  divider: '--color-divider',
  // Highlights
  highlightSoft: '--color-highlight-soft',
  neutralMedium: '--color-neutral-medium',
  neutralSoft: '--color-neutral-soft',
  // Semantic colors
  success: '--color-success',
  // Overlays (for subtle dividers)
  surfaceOverlaySoft: '--color-surface-overlay-soft'};

/**
 * Get candlestick series options with theme colors.
 */
function getCandlestickColors() {
  const {
    downColor,
    upColor
  } = getSeriesColors();
  return {
    borderDownColor: downColor,
    borderUpColor: upColor,
    downColor,
    upColor,
    wickDownColor: downColor,
    wickUpColor: upColor
  };
}

/**
 * Get chart theme options derived from current CSS variables.
 *
 * Call this when creating the chart to get theme-aware colors. If CSS variables change (theme switch), you'll need to
 * recreate the chart or call chart.applyOptions() with fresh theme values.
 */
function getChartTheme() {
  // Read current CSS variable values
  const background = getCssVar(CSS_VARS.background, '#282A36');
  const textColor = getCssVar(CSS_VARS.neutralMedium, '#F8F8F2c4');
  // Use divider color for consistency with edge-panel and other UI components
  const dividerColor = getCssVar(CSS_VARS.divider, '#44475A');
  // Use overlay-soft for subtle grid lines within panes (less prominent than dividers)
  const gridColor = getCssVar(CSS_VARS.surfaceOverlaySoft, '#ffffff0f');
  // Use brand color for pane separators to signal interactive resize affordance.
  const paneSeparatorColor = getCssVar(CSS_VARS.brand, '#BD93F9');
  const paneSeparatorHoverColor = getCssVar(CSS_VARS.brand, '#BD93F9');
  const crosshairColor = getCssVar(CSS_VARS.neutralSoft, '#F8F8F24f');
  return {
    crosshair: {
      horzLine: {
        color: crosshairColor,
        labelBackgroundColor: background
      },
      vertLine: {
        color: crosshairColor,
        labelBackgroundColor: background
      }
    },
    grid: {
      horzLines: {
        color: gridColor
      },
      vertLines: {
        color: gridColor
      }
    },
    layout: {
      attributionLogo: false,
      background: {
        color: background
      },
      textColor,
      panes: {
        separatorColor: paneSeparatorColor,
        separatorHoverColor: paneSeparatorHoverColor
      }
    },
    leftPriceScale: {
      borderColor: dividerColor
    },
    rightPriceScale: {
      borderColor: dividerColor
    },
    timeScale: {
      borderColor: dividerColor
    }
  };
}

/**
 * Get color for pane labels (series names displayed on chart). Uses neutral-medium for readable but not overpowering
 * text.
 */
function getPaneLabelColor() {
  return getCssVar(CSS_VARS.neutralMedium, '#F8F8F2c4');
}

/**
 * Get semantic colors for series (candlesticks, lines, etc.)
 *
 * Returns colors that match the current theme for:
 *
 * - UpColor: Price increase (green/success)
 * - DownColor: Price decrease (red/danger)
 * - LineColor: Default line color (brand/purple)
 */
function getSeriesColors() {
  return {
    downColor: getCssVar(CSS_VARS.danger, '#FF5555'),
    lineColor: getCssVar(CSS_VARS.brand, '#BD93F9'),
    upColor: getCssVar(CSS_VARS.success, '#50FA7B'),
    volumeColor: getCssVar(CSS_VARS.highlightSoft, '#FF79C680')
  };
}

export { getCandlestickColors, getChartTheme, getPaneLabelColor, getSeriesColors };
//# sourceMappingURL=chart-theme.js.map
