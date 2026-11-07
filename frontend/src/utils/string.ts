/**
 * Purpose:
 * - Utility functions for string manipulation.
 *
 * Functions:
 * - `capitalize(s)`: Capitalizes the first letter of the input string.
 * - `camelCaseToWords(s)`: Converts a camelCase string to a space-separated string with capitalized words.
 * - `snakeToTitle(s)`: Converts a snake_case string to a title case string with spaces.
 */

export function capitalize(s: string): string {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

export function camelCaseToWords(s: string): string {
  const result = s.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function snakeToTitle(s: string): string {
  return s
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
