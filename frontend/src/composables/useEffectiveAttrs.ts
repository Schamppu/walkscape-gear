import { computed, type ComputedRef, type Ref } from "vue";
import { useRequirements, type RequirementContext } from "./useRequirements";
import { useLevelBonus, type LevelBonusContext } from "./useLevelBonus";
import { useFineInputBenefit } from "./useFineInputBenefit";
import { toDeepRaw } from "../utils/rawData";
import type { ItemDetail } from "@/domain/types/item";
import type { ServiceDetail } from "@/domain/types/service";
import {
  resolveItemAttrs,
  buildAllAttrEntries,
  calculateStatTotals,
  type EffectiveAttrEntry,
  type StatTotals,
} from "@/domain/effectiveAttrs";

export type { EffectiveAttrEntry, StatTotals };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EffectiveAttrsContext = LevelBonusContext & {
  ownedItemsByCategory: (category: string) => ItemDetail[];
  service: Ref<ServiceDetail | null>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useEffectiveAttrs(ctx: EffectiveAttrsContext): {
  allAttrs: ComputedRef<EffectiveAttrEntry[]>;
  effectiveAttrs: ComputedRef<EffectiveAttrEntry[]>;
  totalsByStat: ComputedRef<StatTotals>;
} {
  const { checkRequirements } = useRequirements(ctx);
  const { workEfficiencyBonus, qualityOutcomeBonus } = useLevelBonus(ctx);
  const { fineInputBonusAttrs } = useFineInputBenefit(ctx);

  const allEquippedItems = computed(() => {
    const rawItems = toDeepRaw([
      ...ctx.ownedItemsByCategory("collectibles"),
      ...(ctx.equippedGear.value as ItemDetail[]),
    ]);
    return resolveItemAttrs(rawItems);
  });

  const allAttrs = computed<EffectiveAttrEntry[]>(() =>
    buildAllAttrEntries(
      allEquippedItems.value,
      workEfficiencyBonus.value,
      qualityOutcomeBonus.value,
      ctx.service.value,
      fineInputBonusAttrs.value,
    ),
  );

  const effectiveAttrs = computed<EffectiveAttrEntry[]>(() =>
    effectiveAttrsWithContext(ctx),
  );

  const effectiveAttrsWithContext = (
    context: RequirementContext,
  ): EffectiveAttrEntry[] => {
    return allAttrs.value.filter(({ requirements }) =>
      checkRequirements(requirements, context),
    );
  };

  const totalsByStat = computed<StatTotals>(() =>
    calculateStatTotals(effectiveAttrs.value),
  );

  return {
    allAttrs,
    effectiveAttrs,
    totalsByStat,
  };
}
