/**
 * Purpose:
 * Reactive composable resolving the extra output of equipped abilities that
 * instantly complete actions of the current activity / recipe via a
 * `completeActions` action (e.g. "Flambé", "Down Go The Trees").
 *
 * A section is produced only for abilities usable in the current context
 * (their requirements pass) with a steps-derivable cooldown. Each section's
 * drop info is the context's drops rescaled by the ability's rate, plus — for
 * recipes — the recipe output split into normal/fine by the ability's own
 * fine recipe outcome (Flambé).
 *
 * Mirrors the structure of `useAbilityLootTables`.
 */

import { computed, watch, type ComputedRef } from "vue";
import { useDataStore } from "@/store/data";
import { useItemsStore } from "@/store/items";
import {
  useRequirements,
  type RequirementContext,
} from "@/composables/useRequirements";
import {
  useSkillModifiers,
  type SkillModifiersContext,
} from "@/composables/useSkillModifiers";
import {
  useFineMaterials,
  type FineMaterialsContext,
} from "@/composables/useFineMaterialsCalculations";
import { collectEquippedAbilityIds } from "@/domain/abilities/equippedAbilities";
import {
  abilityUsageRequirements,
  abilityStepsPerActivation,
} from "@/domain/abilities/abilityLootTables";
import {
  extractCompleteActionsSpec,
  abilityFineRecipeOutcome,
  completeActionsScale,
  scaleDropInfoMap,
  buildRecipeOutputDropInfo,
} from "@/domain/abilities/completeActions";
import type { DropItemInfo } from "@/domain/lootTables/dropInfo";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { EquippedItem } from "@/store/gear";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompleteActionsAbilityInfo = {
  abilityId: string;
  name: string;
  icon: string;
  /** Actions completed per activation. */
  count: number;
  /** Steps between activations (always steps-derivable here). */
  stepsPerActivation: number;
  /** Per-step rate multiplier relative to the context (see domain helper). */
  scale: number;
  /** Fine share of completed recipes' output (0–1); 0 for activities. */
  fineShare: number;
  dropInfoMap: Record<string, DropItemInfo>;
};

type Ctx = {
  equippedGear: ComputedRef<EquippedItem[]>;
  recipeSelected: ComputedRef<boolean>;
  source: ComputedRef<unknown>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useCompleteActionsAbilities(
  ctx: Ctx,
  dropItemInfoMap: ComputedRef<Record<string, DropItemInfo>>,
): ComputedRef<CompleteActionsAbilityInfo[]> {
  const dataStore = useDataStore();
  const itemsStore = useItemsStore();

  const { checkRequirements } = useRequirements(
    ctx as unknown as RequirementContext,
  );
  const { stepsPerAction, stepsPerCompletion, stepsPerRewardRoll } =
    useSkillModifiers(ctx as unknown as SkillModifiersContext);
  const { useFine } = useFineMaterials(ctx as unknown as FineMaterialsContext);

  // Ability ids from every equipped item; fetch their details on change.
  const abilityIds = computed(() =>
    collectEquippedAbilityIds(ctx.equippedGear.value),
  );
  watch(
    abilityIds,
    (ids) => {
      if (ids.length) void dataStore.fetchDetailedAbilities(ids);
    },
    { immediate: true },
  );

  return computed<CompleteActionsAbilityInfo[]>(() => {
    const recipe = ctx.recipeSelected.value
      ? (ctx.source.value as RecipeDetail)
      : null;

    const iconOf = (id: string): string | undefined =>
      itemsStore.allGearItems[id]?.icon ??
      itemsStore.materials[id]?.icon ??
      recipe?.icon;

    return abilityIds.value
      .map((id) => dataStore.detailedAbilitiesMap[id])
      .map((detail): CompleteActionsAbilityInfo | null => {
        if (!detail) return null;
        const spec = extractCompleteActionsSpec(detail);
        if (!spec) return null;
        if (!checkRequirements(abilityUsageRequirements(detail))) return null;

        const stepsPerActivation = abilityStepsPerActivation(
          detail.cooldown,
          stepsPerAction.value,
        );
        const scale = completeActionsScale(
          spec.count,
          stepsPerCompletion.value,
          stepsPerActivation,
        );
        if (stepsPerActivation === null || scale <= 0) return null;

        const fineShare = recipe
          ? useFine.value
            ? 1
            : abilityFineRecipeOutcome(detail, (reqs) =>
                checkRequirements(reqs ?? []),
              )
          : 0;

        const outputs = recipe
          ? buildRecipeOutputDropInfo({
              itemRewards: recipe.itemRewards ?? {},
              stepsPerRewardRoll: stepsPerRewardRoll.value,
              scale,
              fineShare,
              fineMaterialIds: itemsStore.fineMaterials,
              craftedGearIds: Object.fromEntries(
                Object.keys(recipe.itemRewards ?? {})
                  .filter((r) => itemsStore.allGearItems[r]?.type === "crafted")
                  .map((r) => [r, true]),
              ),
              iconOf,
            })
          : {};

        return {
          abilityId: detail.id,
          name: detail.name,
          icon: detail.icon,
          count: spec.count,
          stepsPerActivation,
          scale,
          fineShare,
          // Recipe output first in display order; it wins on an id clash.
          dropInfoMap: {
            ...outputs,
            ...scaleDropInfoMap(dropItemInfoMap.value, scale),
            ...outputs,
          },
        };
      })
      .filter((s): s is CompleteActionsAbilityInfo => s !== null);
  });
}
