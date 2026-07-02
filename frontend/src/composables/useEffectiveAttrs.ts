import { computed, watch, type ComputedRef, type Ref } from "vue";
import { useRequirements, type RequirementContext } from "./useRequirements";
import { useLevelBonus, type LevelBonusContext } from "./useLevelBonus";
import { useFineInputBenefit } from "./useFineInputBenefit";
import { useAbilityAttrContext } from "./useAbilityAttrContext";
import { toDeepRaw } from "../utils/rawData";
import { useDataStore } from "@/store/data";
import {
  attachPetAbilityAttrs,
  unlockedAbilityIds,
} from "@/domain/abilities/petAbilityAttrs";
import type { ItemDetail } from "@/domain/types/item";
import type { PetDetail } from "@/domain/types/pet";
import type { ServiceDetail } from "@/domain/types/service";
import {
  resolveItemAttrs,
  buildAllAttrEntries,
  calculateStatTotals,
  type EffectiveAttrEntry,
  type StatTotals,
} from "@/domain/effectiveAttrs";

/** Equipped pet shape: a PetDetail carrying its level as `quality`. */
type EquippedPet = PetDetail & { quality?: string | null };

/** Extracts equipped pets (the pet slot occupant) from a mixed equipped list. */
const equippedPetsOf = (items: unknown[]): EquippedPet[] =>
  items.filter(
    (it): it is EquippedPet =>
      !!it && typeof it === "object" && "egg" in it && "abilities" in it,
  );

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
  const abilityCtx = useAbilityAttrContext();
  const dataStore = useDataStore();

  // Enrich the pet slot occupant with its ability attributes (passive always,
  // active unless toggled off) so `usedAttrs` includes them. Reading the toggle
  // state here keeps totals reactive to enabling/disabling active abilities.
  const allEquippedItems = computed(() => {
    const rawItems = toDeepRaw([
      ...ctx.ownedItemsByCategory("collectibles"),
      ...(ctx.equippedGear.value as ItemDetail[]),
    ]).map((item) => attachPetAbilityAttrs(item, abilityCtx.value));
    return resolveItemAttrs(rawItems);
  });

  const equippedPets = computed(() =>
    equippedPetsOf(ctx.equippedGear.value as unknown[]),
  );

  // Lazily fetch the equipped pet's unlocked ability details so their
  // attributes become available; the computed above re-runs once they arrive.
  watch(
    () =>
      equippedPets.value.flatMap((pet) =>
        unlockedAbilityIds(pet, Number(pet.quality) || 0),
      ),
    (ids) => {
      if (ids.length) void dataStore.fetchDetailedAbilities(ids);
    },
    { immediate: true },
  );

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
