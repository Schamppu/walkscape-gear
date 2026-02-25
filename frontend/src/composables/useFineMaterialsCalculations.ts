import { computed, type ComputedRef, type Ref } from "vue";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { ActivityNone } from "@/domain/constants/activityNone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FineMaterialsContext = {
  recipeSelected: Ref<boolean>;
  recipe: Ref<RecipeDetail | ActivityNone | null>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useFineMaterials(ctx: FineMaterialsContext): {
  canUseFineMaterials: ComputedRef<boolean>;
  xpRewardsMultiplier: ComputedRef<number>;
  useFine: ComputedRef<boolean>;
} {
  const activityStore = useActivityStore();
  const itemsStore = useItemsStore();

  const canUseFineMaterials = computed<boolean>(() => {
    if (!ctx.recipeSelected.value) return false;

    const upgraded = itemsStore.itemsByCategory["upgraded_crafted"].map(
      ({ id }) => id,
    );
    const reward = Object.keys(
      (ctx.recipe.value as RecipeDetail).itemRewards,
    )[0];
    return !upgraded.includes(reward);
  });

  const xpRewardsMultiplier = computed<number>(() =>
    canUseFineMaterials.value && activityStore.useFineMaterials ? 1.75 : 1,
  );

  const useFine = computed<boolean>(
    () => canUseFineMaterials.value && activityStore.useFineMaterials,
  );

  return { canUseFineMaterials, xpRewardsMultiplier, useFine };
}
