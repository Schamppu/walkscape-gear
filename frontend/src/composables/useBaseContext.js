import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useItemsStore } from "@/store/items";
import { useGearStore } from "@/store/gear";

function useBaseContext() {
  const activityStore = useActivityStore();
  const playerStore = usePlayerStore();
  const itemsStore = useItemsStore();
  const gearStore = useGearStore();

  return {
    activitySelected: computed(() => activityStore.activitySelected),
    recipeSelected: computed(() => activityStore.recipeSelected),

    activity: computed(() => activityStore.activity),
    recipe: computed(() => activityStore.recipe),

    skillLevels: computed(() => playerStore.skillLevels),

    items: computed(() => itemsStore.allItems),

    gearSlots: computed(() => gearStore.gearSlots),
  };
}

export default useBaseContext;
