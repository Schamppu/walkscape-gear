import { computed, type ComputedRef } from "vue";
import { useActivityStore } from "@/store/activity";
import { useGearStore, type EquippedGearSet, type EquippedItem } from "@/store/gear";
import { useItemsStore, type OwnedItemState, type MaterialInfo } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useRouteStore, type RouteSegment } from "@/store/route";
import type { ActivityNone } from "@/domain/constants/activityNone";
import type { ActivityDetail } from "@/domain/types/activity";
import type { RecipeDetail } from "@/domain/types/recipe";
import type { ServiceDetail } from "@/domain/types/service";
import type { LocationDetail } from "@/domain/types/location";
import type { ItemDetail } from "@/domain/types/item";

export type BaseContext = {
  activitySelected: ComputedRef<boolean>;
  recipeSelected: ComputedRef<boolean>;

  activity: ComputedRef<ActivityDetail | ActivityNone | null>;
  recipe: ComputedRef<RecipeDetail | ActivityNone | null>;
  source: ComputedRef<ActivityDetail | RecipeDetail | ActivityNone | null>;
  location: ComputedRef<LocationDetail | null>;
  service: ComputedRef<ServiceDetail | null>;
  embargoedActivities: ComputedRef<Set<string>>;

  skillLevels: ComputedRef<Record<string, number>>;
  achievementPoints: ComputedRef<number>;
  factionReputation: ComputedRef<Record<string, number>>;

  allGearItems: ComputedRef<Record<string, ItemDetail>>;
  itemsByCategory: ComputedRef<Record<string, ItemDetail[]>>;
  ownedItems: ComputedRef<Record<string, OwnedItemState>>;
  embargoedItems: ComputedRef<Set<string>>;
  materials: ComputedRef<Record<string, MaterialInfo>>;

  gearSlots: ComputedRef<EquippedGearSet>;
  equippedGear: ComputedRef<EquippedItem[]>;
  filledGearSlots: ComputedRef<[string, EquippedItem][]>;

  segments: ComputedRef<RouteSegment[]>;

  ownedItemsByCategory: (category: string) => ItemDetail[];
};

function useBaseContext(): BaseContext {
  const activityStore = useActivityStore();
  const gearStore = useGearStore();
  const itemsStore = useItemsStore();
  const playerStore = usePlayerStore();
  const routeStore = useRouteStore();

  return {
    activitySelected: computed(() => activityStore.activitySelected),
    recipeSelected: computed(() => activityStore.recipeSelected),

    activity: computed(() =>
      activityStore.activitySelected ? activityStore.activity : null,
    ),
    recipe: computed(() =>
      activityStore.recipeSelected ? activityStore.recipe : null,
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

    allGearItems: computed(() => itemsStore.allGearItems),
    itemsByCategory: computed(() => itemsStore.itemsByCategory),
    ownedItems: computed(() => itemsStore.ownedItems),
    embargoedItems: computed(() => itemsStore.embargoedItems),
    materials: computed(() => itemsStore.materials),

    gearSlots: computed(() => gearStore.selectedGearset),
    equippedGear: computed(() => gearStore.equippedGear),
    filledGearSlots: computed(() => gearStore.filledGearSlots),

    segments: computed(() => routeStore.segments),

    ownedItemsByCategory: itemsStore.ownedItemsByCategory,
  };
}

export default useBaseContext;
