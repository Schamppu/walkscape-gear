import { computed } from "vue";
import { useItemsStore } from "@/store/items";
import { useActivityStore } from "@/store/activity";

export function useFineMaterials(ctx) {
  const activityStore = useActivityStore();
  const itemsStore = useItemsStore();

  const canUseFineMaterials = computed(() => {
    if (!ctx.recipeSelected.value) return false;

    const upgraded = itemsStore.itemsByCategory["upgraded_crafted"].map(
      ({ id }) => id,
    );
    const reward = Object.keys(ctx.recipe.value.itemRewards)[0];
    return !upgraded.includes(reward);
  });

  const xpRewardsMultiplier = computed(() =>
    canUseFineMaterials.value && activityStore.useFineMaterials ? 1.75 : 1,
  );

  const useFine = computed(
    () => canUseFineMaterials.value && activityStore.useFineMaterials,
  );

  return { canUseFineMaterials, xpRewardsMultiplier, useFine };
}
