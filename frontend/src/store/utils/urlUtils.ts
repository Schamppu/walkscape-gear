/**
 * Purpose:
 * Pure helper functions for URL parameter parsing used by the URL store.
 *
 * Does NOT:
 * - Import Vue or Pinia.
 * - Access any store state directly.
 * - Contain side effects.
 */

// ---------------------------------------------------------------------------
// Gear-set ID parsing
// ---------------------------------------------------------------------------

/**
 * Read a gear-set ID from URL search params.
 *
 * Returns `null` when the parameter is absent, non-numeric, or ≤ 0.
 *
 * @param params URLSearchParams from the current location.
 * @param key    The query-string key to look up (e.g. "gs" or "gs2").
 */
export function parseGearSetId(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return !isNaN(id) && id > 0 ? id : null;
}
