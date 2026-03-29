import { computed, type ComputedRef, type Ref } from "vue";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useFineMaterials(_ctx?: FineMaterialsContext): {
  xpRewardsMultiplier: ComputedRef<number>;
  useFine: ComputedRef<boolean>;
} {
  const activityStore = useActivityStore();

  const xpRewardsMultiplier = computed<number>(() =>
    activityStore.useFineMaterials ? 1.75 : 1,
  );

  const useFine = computed<boolean>(() => activityStore.useFineMaterials);

  return { xpRewardsMultiplier, useFine };
}
