import { computed, type ComputedRef, type Ref } from "vue";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { ActivityNone } from "@/domain/constants/activityNone";
import type { FineMaterialsMode } from "@/domain/quality/qualityOutcomeOdds";

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
  fineMode: ComputedRef<FineMaterialsMode>;
  xpRewardsMultiplier: ComputedRef<number>;
  useFine: ComputedRef<boolean>;
} {
  const activityStore = useActivityStore();
  const itemsStore = useItemsStore();

  const fineMode = computed<FineMaterialsMode>(() => {
    if (!activityStore.useFineMaterials) return "none";
    if (!ctx.recipeSelected.value) return "none";

    const recipe = ctx.recipe.value as RecipeDetail;
    const groups = recipe.materials;
    const fineGroupCount = groups.filter(({ options }) =>
      options.some(({ item }) => itemsStore.fineMaterials[item]),
    ).length;

    if (fineGroupCount === 0) return "none";
    if (fineGroupCount === groups.length) return "all";
    return "partial";
  });

  const xpRewardsMultiplier = computed<number>(() =>
    activityStore.useFineMaterials ? 1.75 : 1,
  );

  const useFine = computed<boolean>(() => activityStore.useFineMaterials);

  return { fineMode, xpRewardsMultiplier, useFine };
}
