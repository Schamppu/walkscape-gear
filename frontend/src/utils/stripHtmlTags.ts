/**
 * Utility function to strip HTML tags from a string.
 *
 * Function:
 * - `stripHtmlTags(text)`: Takes a string input and returns
 *    a new string with all HTML tags removed. If the input is
 *    falsy (e.g., null, undefined, empty), it returns an empty string.
 */

export const stripHtmlTags = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "");
};
