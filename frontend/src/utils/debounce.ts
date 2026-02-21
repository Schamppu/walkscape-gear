/**
 * Debounce function to limit the rate at which a function can fire.
 * Useful for things like search input where you don't want to trigger a search on every keystroke.
 *
 * Example usage:
 * const debouncedSearch = debounce((query) => {
 *   // perform search with query
 * }, 300);
 *
 * In this example, the search function will only be called 300ms after the last call to debouncedSearch.
 * If debouncedSearch is called again before the 300ms is up, the timer resets.
 */
export default function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  delay: number,
  context: object | null = null
): (...args: T) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: T) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context ?? this, args);
    }, delay);
  };
}
