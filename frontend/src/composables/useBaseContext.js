import { computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore } from "@/store/gear";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useRouteStore } from "@/store/route";

function useBaseContext() {
  const activityStore = useActivityStore();
  const gearStore = useGearStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();
  const routeStore = useRouteStore();

  return {
    activitySelected: computed(() => activityStore.activitySelected),
    recipeSelected: computed(() => activityStore.recipeSelected),

    activity: computed(() =>
      activityStore.activitySelected ? activityStore.activity : null
    ),
    recipe: computed(() =>
      activityStore.recipeSelected ? activityStore.recipe : null
    ),
    source: computed(() => {
      if (activityStore.activitySelected) return activityStore.activity;
      if (activityStore.recipeSelected) return activityStore.recipe;
      return null;
    }),
    location: computed(() => activityStore.location),
    service: computed(() => activityStore.service),
    embargoedActivities: computed(() => activityStore.embargoedActivities),

    skillLevels: computed(() => playerStore.skillLevels),
    achievementPoints: computed(() => playerStore.achievementPoints),
    factionReputation: computed(() => playerStore.factionReputation),

    allItems: computed(() => itemsStore.allItems),
    itemsByCategory: computed(() => itemsStore.itemsByCategory),
    ownedItems: computed(() => itemsStore.ownedItems),
    embargoedItems: computed(() => itemsStore.embargoedItems),

    gearSlots: computed(() => gearStore.gearSlots),
    equippedGear: computed(() => gearStore.equippedGear),

    segments: computed(() => routeStore.segments),
  };
}

export default useBaseContext;
