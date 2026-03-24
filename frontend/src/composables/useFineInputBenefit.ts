import { computed, type ComputedRef, type Ref } from "vue";
import { useDataStore } from "@/store/data";
import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import type { EffectiveAttrEntry } from "@/domain/effectiveAttrs";
import type { ActivityDetail, ActivityInputOption } from "@/domain/types/activity";
import type { ActivityNone } from "@/domain/constants/activityNone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FineInputBenefitContext = {
  activitySelected: Ref<boolean>;
  activity: Ref<ActivityDetail | ActivityNone | null>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Determines whether the selected activity supports fine input benefits and,
 * when the player enables them, computes the bonus `EffectiveAttrEntry` objects
 * from the `fineInputBenefit` global variable.
 *
 * Applied in the same pipeline as level-bonus attrs via `buildAllAttrEntries`.
 */
export function useFineInputBenefit(ctx: FineInputBenefitContext): {
  canUseFineInputs: ComputedRef<boolean>;
  fineInputBonusAttrs: ComputedRef<EffectiveAttrEntry[]>;
} {
  const dataStore = useDataStore();
  const activityStore = useActivityStore();
  const itemsStore = useItemsStore();

  /** True when all materials required by the activity's input options have fine versions available. */
  const canUseFineInputs = computed<boolean>(() => {
    if (!ctx.activitySelected.value) return false;
    const activity = ctx.activity.value as ActivityDetail | null;

    const inputOptions =
      activity?.options?.filter(
        (opt): opt is ActivityInputOption => opt.type === "inputActivity",
      ) ?? [];

    if (inputOptions.length === 0) return false;

    return inputOptions.every((opt) =>
      opt.inputs.every((input) => {
        if (input.type === "specific") {
          return input.item in itemsStore.fineMaterials;
        } else if (input.type === "keyword") {
          const materialsWithKeyword = Object.values(itemsStore.materials).filter(
            (m) => m.keywords?.includes(input.keyword),
          );
          return (
            materialsWithKeyword.length > 0 &&
            materialsWithKeyword.every(({ id }) => id in itemsStore.fineMaterials)
          );
        }
        return false;
      }),
    );
  });

  /** Effective attr entries derived from the fineInputBenefit global variable when active. */
  const fineInputBonusAttrs = computed<EffectiveAttrEntry[]>(() => {
    if (!canUseFineInputs.value || !activityStore.useFineInputs) return [];

    const variable = dataStore.globalVariables.find(
      (v) => v.type === "fineInputBenefit",
    );
    if (!variable) return [];

    const item = {
      id: "fine_input_benefit",
      name: "Fine Input Benefit",
      icon: "",
    };
    return variable.attrs.map((attr) => ({ ...attr, item }));
  });

  return { canUseFineInputs, fineInputBonusAttrs };
}
