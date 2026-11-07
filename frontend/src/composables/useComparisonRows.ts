/**
 * Purpose:
 * Reactive wrapper around `buildComparisonRow` for comparison table components.
 *
 * Responsibilities:
 * - Read scalar values from two `useSkillModifiers` results.
 * - Delegate row math to the pure domain function.
 * - Format display strings using `n()` (requires Vue setup context for Pinia).
 *
 * Does NOT:
 * - Contain any game-logic calculations.
 * - Access stores directly beyond what `n()` needs internally.
 */

import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import { n } from "@/utils/number";
import {
  buildComparisonRow,
  type ComparisonRowInput,
} from "@/domain/comparison/comparisonRows";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Definition of a single comparison row driven by a skill-modifier key.
 */
export type ComparisonRowDef = Omit<ComparisonRowInput, "v1" | "v2"> & {
  /** Key on the `useSkillModifiers` return value (must be a scalar `ComputedRef<number>`). */
  key: string;
};

/**
 * A fully formatted row ready for `ComparisonValueRow`.
 */
export type ComparisonTableRow = {
  title: string;
  left: string;
  right: string;
  comp: number;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Returns a `ComputedRef<ComparisonTableRow[]>` driven by two skill-modifier
 * objects and an array of row definitions.
 *
 * `rowDefs` can be a plain array (static rows) or a `ComputedRef` / getter
 * function (when row options depend on reactive state, e.g. `modifyValue`
 * captures a reactive `rewardCount`).
 *
 * @param sm1      Return value of `useSkillModifiers` for gear set 1.
 * @param sm2      Return value of `useSkillModifiers` for gear set 2.
 * @param rowDefs  Row definitions, or a reactive ref / getter that returns them.
 */
export function useComparisonRows(
  sm1: Record<string, ComputedRef<number>>,
  sm2: Record<string, ComputedRef<number>>,
  rowDefs: MaybeRefOrGetter<ComparisonRowDef[]>,
): ComputedRef<ComparisonTableRow[]> {
  return computed(() =>
    toValue(rowDefs).map((def) => {
      const { key, ...opts } = def;
      const result = buildComparisonRow({
        ...opts,
        v1: sm1[key].value,
        v2: sm2[key].value,
      });
      const suffix = result.isPercent ? "%" : "";
      return {
        title: result.title,
        left: `${n(result.v1, 2)}${suffix}`,
        right: `${n(result.v2, 2)}${suffix}`,
        comp: result.comp,
      };
    }),
  );
}
