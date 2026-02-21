/**
 * Purpose:
 * Utility function for deep equality check between two values, which can be primitives, arrays, or objects.
 *
 * Responsibilities:
 * - Recursively compare two values for deep equality
 *
 * Does NOT:
 * - Handle special cases like functions, dates, or circular references
 * - Perform any type coercion (strict equality is used for primitives)
 * - Optimize for performance (not designed for large or deeply nested structures)
 * - Assume any specific data structure (works for plain objects and arrays)
 */

export function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or primitive equality
  if (a === b) return true;

  // Handle null or non-object types
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  // Arrays vs objects mismatch
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aa = a as Record<string, unknown>;
  const bb = b as Record<string, unknown>;

  const keysA = Object.keys(aa);
  const keysB = Object.keys(bb);

  // Different number of keys
  if (keysA.length !== keysB.length) return false;

  // Compare each key recursively
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(bb, key)) {
      return false;
    }

    if (!isEqual(aa[key], bb[key])) {
      return false;
    }
  }

  return true;
}

export default isEqual;
