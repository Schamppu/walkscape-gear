/**
 * Purpose:
 * Utility function to convert ARGB hex color codes to RGBA format for CSS usage.
 *
 *  Example:
 *  Input: "80FF0000" (50% transparent red)
 *  Output: "rgba(255,0,0,0.5)"
 *
 * The function handles both 8-digit ARGB and falls back to 6-digit hex if needed.
 *
 * Usage:
 * const rgbaColor = argbToRgba("80FF0000");
 *
 * Does NOT:
 * - Validate the input format.
 * - Handle shorthand hex codes (e.g., "FFF").
 */
export function argbToRgba(argb: string): string {
  if (argb.length === 8) {
    const a = parseInt(argb.slice(0, 2), 16) / 255;
    const r = parseInt(argb.slice(2, 4), 16);
    const g = parseInt(argb.slice(4, 6), 16);
    const b = parseInt(argb.slice(6, 8), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  // fallback for 6-digit hex
  if (argb.length === 6) {
    return `#${argb}`;
  }
  return argb;
}
