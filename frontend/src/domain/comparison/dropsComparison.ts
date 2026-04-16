/**
 * Purpose:
 * Pure function for partitioning two drop maps into a 3-way comparison.
 *
 * Responsibilities:
 * - Classify keys as present in both maps, only in A, or only in B.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of partitioning two record key sets into three groups. */
export type DropKeyPartition = {
  /** Keys present in both A and B. */
  both: string[];
  /** Keys present only in A. */
  onlyA: string[];
  /** Keys present only in B. */
  onlyB: string[];
};

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Partitions the keys of two record objects into three disjoint groups.
 *
 * Single-pass over A, then single-pass over B — O(|A| + |B|) time.
 *
 * @param A  First drop map (keyed by item id or group key).
 * @param B  Second drop map.
 */
export function partitionDropKeys(
  A: Record<string, unknown>,
  B: Record<string, unknown>,
): DropKeyPartition {
  const both: string[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];

  for (const key in A) {
    if (key in B) {
      both.push(key);
    } else {
      onlyA.push(key);
    }
  }

  for (const key in B) {
    if (!(key in A)) {
      onlyB.push(key);
    }
  }

  return { both, onlyA, onlyB };
}
