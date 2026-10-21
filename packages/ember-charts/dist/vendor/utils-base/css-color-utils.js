/**
 * CSS Color Utilities
 *
 * Utilities for reading CSS variables and converting CSS color values (including modern formats like oklch()) to
 * hex/rgba format. Useful when passing theme colors to canvas-based libraries that do not support modern CSS color
 * syntax.
 *
 * SSR-safe: all functions return the input/fallback unchanged when `document` is unavailable.
 */

/**
 * Convert any CSS color value to hex or rgba format.
 *
 * Uses a temporary canvas element to convert the color, which handles any valid CSS color including oklch() and other
 * modern formats that canvas-based libraries may not support.
 */
function cssColorToHex(cssColor) {
  if (typeof document === 'undefined') return cssColor;

  // If already hex, return as-is
  if (cssColor.startsWith('#')) return cssColor;

  // Use canvas to convert any CSS color to rgba, then to hex
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const imageData = ctx.getImageData(0, 0, 1, 1).data;
  const r = imageData[0];
  const g = imageData[1];
  const b = imageData[2];
  const a = imageData[3];

  // Handle alpha channel
  if (a !== undefined && a < 255) {
    const alpha = Math.round(a / 255 * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Convert to hex
  const toHex = n => (n ?? 0).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Read a CSS variable value from the document root and convert to hex/rgba.
 *
 * Returns the computed value converted via `cssColorToHex`, or `fallback` if the variable is not set or `document` is
 * unavailable.
 */
function getCssVar(varName, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value) return fallback;
  return cssColorToHex(value);
}

/**
 * Parse hex (#RGB / #RRGGBB / #RRGGBBAA) or rgba() string into [r, g, b] components (0–255). Returns undefined if
 * unparseable.
 */
function parseRgb(color) {
  const rgbaMatch = color.match(/^\s*rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1], 10), parseInt(rgbaMatch[2], 10), parseInt(rgbaMatch[3], 10)];
  }
  const hex = color.replace(/^#/, '');
  const full = hex.length === 3 ? hex.replace(/./g, c => c + c) : hex.slice(0, 6);
  if (full.length < 6) return undefined;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/**
 * Linearly interpolate `from` toward `to` by `strength` (0 = fully `from`, 1 = fully `to`).
 *
 * Returns a fully opaque `rgba()` string. Falls back to `from` if either color cannot be parsed. Used for CPU-side
 * dimming of WebGL circle/square nodes where sigma's vertex shader bias corrupts alpha values.
 */
function mixColors({
  from,
  strength,
  to
}) {
  const s = Math.max(0, Math.min(1, strength));
  const a = parseRgb(from);
  const b = parseRgb(to);
  if (!a || !b) return from;
  const lerp = (x, y) => Math.round(x + (y - x) * s);
  return `rgba(${lerp(a[0], b[0])}, ${lerp(a[1], b[1])}, ${lerp(a[2], b[2])}, 1)`;
}

export { cssColorToHex, getCssVar, mixColors };
//# sourceMappingURL=css-color-utils.js.map
