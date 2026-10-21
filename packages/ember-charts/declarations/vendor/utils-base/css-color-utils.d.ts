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
export declare function cssColorToHex(cssColor: string): string;
/**
 * Read a CSS variable value from the document root and convert to hex/rgba.
 *
 * Returns the computed value converted via `cssColorToHex`, or `fallback` if the variable is not set or `document` is
 * unavailable.
 */
export declare function getCssVar(varName: string, fallback: string): string;
/**
 * Linearly interpolate `from` toward `to` by `strength` (0 = fully `from`, 1 = fully `to`).
 *
 * Returns a fully opaque `rgba()` string. Falls back to `from` if either color cannot be parsed. Used for CPU-side
 * dimming of WebGL circle/square nodes where sigma's vertex shader bias corrupts alpha values.
 */
export declare function mixColors({ from, strength, to, }: {
    from: string;
    strength: number;
    to: string;
}): string;
//# sourceMappingURL=css-color-utils.d.ts.map