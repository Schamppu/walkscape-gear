/**
 * Utility function to check if a value is empty.
 * - For arrays, it checks if the length is 0.
 * - For objects, it checks if there are no keys.
 * - For other types, it returns false (not considered empty).
 *
 * Example usage:
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty([1, 2]); // false
 * isEmpty({ a: 1 }); // false
 * isEmpty(null); // false
 * isEmpty(undefined); // false
 * isEmpty(''); // false (empty string is not considered empty by this function)
 */
export const isEmpty = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
};
