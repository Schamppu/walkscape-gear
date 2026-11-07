/**
 * Purpose:
 * Pure functions for partitioning and comparing two drop item maps.
 *
 * Responsibilities:
 * - Classify keys as present in both maps, only in A, or only in B.
 * - Compute per-item step comparison rows from two DropItemInfo maps.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Access any stores directly.
 * - Mutate inputs.
 */

import type { DropItemInfo } from "@/domain/lootTables/dropInfo";

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

/** Per-item step values extracted from a DropItemInfo for comparison. */
export type DropStepValues = {
  id: string;
  icon: string | undefined;
  stepsPerItem: number;
  stepsPerNormal: number;
  stepsPerFine: number;
  stepsPerRare: number;
};

/**
 * One row in a side-by-side drop comparison.
 *
 * Positive `comp` means gear set A needs MORE steps per item (A is worse).
 * `g1` / `g2` are null when the item is absent from that gear set.
 */
export type DropComparisonRow = {
  id: string;
  icon: string | undefined;
  /** Positive = A worse (more steps per item). */
  comp: number;
  normalComp: number;
  fineComp: number;
  rareComp: number;
  g1: DropStepValues | null;
  g2: DropStepValues | null;
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

/**
 * Builds a comparison row for every item across two drop maps.
 *
 * Order: items in both sets first, then A-only items, then B-only items.
 * Items present in only one set have `null` for the absent side and `comp = 0`.
 *
 * @param A  DropItemInfo map for gear set 1.
 * @param B  DropItemInfo map for gear set 2.
 */
export function compareDrops(
  A: Record<string, DropItemInfo>,
  B: Record<string, DropItemInfo>,
): DropComparisonRow[] {
  const { both, onlyA, onlyB } = partitionDropKeys(A, B);

  const toSteps = (info: DropItemInfo): DropStepValues => ({
    id: info.id,
    icon: info.icon,
    stepsPerItem: info.stepsPerItem,
    stepsPerNormal: info.stepsPerNormal,
    stepsPerFine: info.stepsPerFine,
    stepsPerRare: info.stepsPerRare,
  });

  const bothRows: DropComparisonRow[] = both.map((key) => {
    const a = toSteps(A[key]);
    const b = toSteps(B[key]);
    return {
      id: a.id,
      icon: a.icon,
      comp: a.stepsPerItem - b.stepsPerItem,
      normalComp: a.stepsPerNormal - b.stepsPerNormal,
      fineComp: a.stepsPerFine - b.stepsPerFine,
      rareComp: a.stepsPerRare - b.stepsPerRare,
      g1: a,
      g2: b,
    };
  });

  const aOnlyRows: DropComparisonRow[] = onlyA.map((key) => {
    const a = toSteps(A[key]);
    return {
      id: a.id,
      icon: a.icon,
      comp: 0,
      normalComp: 0,
      fineComp: 0,
      rareComp: 0,
      g1: a,
      g2: null,
    };
  });

  const bOnlyRows: DropComparisonRow[] = onlyB.map((key) => {
    const b = toSteps(B[key]);
    return {
      id: b.id,
      icon: b.icon,
      comp: 0,
      normalComp: 0,
      fineComp: 0,
      rareComp: 0,
      g1: null,
      g2: b,
    };
  });

  return [...bothRows, ...aOnlyRows, ...bOnlyRows];
}
