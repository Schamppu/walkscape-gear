/**
 * Returns the intersection of two arrays, i.e. the elements that are present in both arrays.
 *
 * Example:
 * intersect([1, 2, 3], [2, 3, 4]) => [2, 3]
 * intersect(['a', 'b', 'c'], ['b', 'c', 'd']) => ['b', 'c']
 *
 * Note:
 * - The function does not handle duplicates; if an element appears multiple times in both arrays, it will only appear once in the result.
 * - The order of elements in the result is not guaranteed to match the order in the input arrays.
 * - The function assumes that the input arrays contain primitive values (e.g., numbers, strings). For complex objects, additional logic would be needed to determine equality.
 */
export function intersect<T>(a: T[], b: T[]): T[] {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  return Array.from(intersection);
}
