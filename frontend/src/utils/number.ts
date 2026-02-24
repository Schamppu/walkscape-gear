import { useSettingsStore } from "@/store/settings";
import { thousandSeparators, decimalSeparators } from "@/constants/settings";

/**
 * Purpose:
 * Utility function for formatting numbers according to user settings.
 * 
 * Responsibilities:
 * - Format numbers with appropriate thousand and decimal separators
 * - Round numbers to specified decimal places
 * - Handle edge cases like null, undefined, and non-numeric values
 * - Centralize number formatting logic for consistency across the app
 * 
 * Parameters:
 * - val: The number to format (can be null or undefined)
 * - decimals: The number of decimal places to round to (default is 3)
 * 
 * Returns:
 * - A string representation of the formatted number, or an empty string for invalid input
 * Example usage:
 * n(1234567.891, 2) → "1 234 567.89" (assuming space as thousand separator and dot as decimal separator)
 * 
 * Does NOT:
 * - Handle localization beyond the specified separators (e.g., currency symbols, negative number formats)
 * - Perform any calculations or transformations on the number beyond formatting
 */
export function n(val: number | null | undefined, decimals: number = 3): string {
  if (val == null || isNaN(val)) return "";

  const settingsStore = useSettingsStore();
  const thousandSeparatorSetting = settingsStore.activitySettings["thousandSeparator"];
  const decimalSeparatorSetting = settingsStore.activitySettings["decimalSeparator"];

  const ts = thousandSeparators[thousandSeparatorSetting?.display || 0].value;
  const ds = decimalSeparators[decimalSeparatorSetting?.display || 0].value;

  const rounded = Number(val.toFixed(decimals));
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return formatted.replace(/,/g, ts).replace(/\./g, ds);
}
