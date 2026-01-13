<script setup>
import { ref, onMounted, computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { usePlayerStore } from "@/store/player";
import { useUrlStore } from "@/store/url";
import { useGearStore } from "@/store/gear";
import TabContentWrapper from "@/components/common/TabContentWrapper.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import ActivityInfo from "./Info/ActivityInfo.vue";
import TravelInfo from "./Info/TravelInfo.vue";
import RecipeInfo from "./Info/RecipeInfo.vue";
import DropsInfo from "./drops/DropsInfo.vue";
import ActivityComparison from "./comparison/ActivityComparison.vue";
import RecipeCalculator from "./calculator/ActivityCalculator.vue";
import RecipeComparison from "./comparison/RecipeComparison.vue";

const activityStore = useActivityStore();
const playerStore = usePlayerStore();
const urlStore = useUrlStore();
const gearStore = useGearStore();

const isLoading = ref(true);
const loadingActivity = ref(false);
const useComparisonView = ref(false);

const activitiesBySkill = ref([]);
const recipesBySkill = ref([]);

onMounted(async () => {
  const noneActivity = activityStore.activities
    .filter(({ id }) => id === "none")
    .map((item) => {
      return { ...item, value: item.name, items: [] };
    })[0];

  const categorize = (source) =>
    playerStore.skills
      .map((skill) => {
        const { id, name: value } = skill;
        return {
          ...skill,
          value,
          items: source
            .filter((item) => {
              const skillsList =
                item.relatedSkillsList ?? item.relatedSkills ?? [];
              return skillsList.length && skillsList[0] === id;
            })
            .map((item) => {
              return {
                ...item,
                value: item.name,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .filter(({ items }) => items.length > 0);

  activitiesBySkill.value = [
    noneActivity,
    ...categorize(activityStore.activities),
  ];
  recipesBySkill.value = [noneActivity, ...categorize(activityStore.recipes)];
  isLoading.value = false;
});

const selectedActivity = computed({
  get: () => activityStore.activity,
  set: (val) => {
    if (val && val.id !== activityStore.activity?.id) {
      selectActivity(val);
    }
  },
});

const selectedRecipe = computed({
  get: () => activityStore.recipe,
  set: (val) => {
    if (val && val.id !== activityStore.recipe?.id) {
      selectRecipe(val);
    }
  },
});

const selectRecipe = async (recipe) => {
  loadingActivity.value = true;
  await activityStore.loadRecipe(recipe.id);
  loadingActivity.value = false;
};

const selectActivity = async (activity) => {
  loadingActivity.value = true;

  await Promise.all([
    activityStore.loadActivity(activity.id),
    activityStore.loadActivityLocations(activity.id),
  ]);
  loadingActivity.value = false;
};

const updateActivityAndUrl = async (activity, update) => {
  await selectActivity(activity);
  if (update) urlStore.encodeAndPushToUrl();
};

const updateRecipeAndUrl = async (recipe, update) => {
  await selectRecipe(recipe);
  if (update) urlStore.encodeAndPushToUrl();
};

const activitySelected = computed(
  () => !loadingActivity.value && activityStore.activitySelected
);
const travellingSelected = computed(() => {
  return activitySelected.value && activityStore.activity?.id === "travelling";
});
const recipeSelected = computed(
  () => !loadingActivity.value && activityStore.recipeSelected
);
</script>

<template>
  <tab-content-wrapper :isLoading="isLoading">
    <nested-dropdown
      label="Activity"
      :data="activitiesBySkill"
      v-model="selectedActivity"
      default-text="Select an activity"
      @select="updateActivityAndUrl"
    />
    <nested-dropdown
      label="Recipe"
      :data="recipesBySkill"
      v-model="selectedRecipe"
      default-text="Select a recipe"
      @select="updateRecipeAndUrl"
    />
    <label v-if="gearStore.bothSetsActive"
      >Comparison view:<input type="checkbox" v-model="useComparisonView"
    /></label>
    <template v-if="gearStore.bothSetsActive && useComparisonView">
      <div v-if="travellingSelected">Travel comparison not supported</div>
      <activity-comparison v-else-if="activitySelected" />
      <recipe-comparison v-if="recipeSelected" />
    </template>
    <template v-else>
      <travel-info v-if="travellingSelected" />
      <activity-info v-else-if="activitySelected" />
      <recipe-info v-if="recipeSelected" />
      <drops-info
        v-if="(activitySelected || recipeSelected) && !travellingSelected" />
      <recipe-calculator v-if="activitySelected || recipeSelected"
    /></template>
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.details {
  width: 100%;
  text-align: start;
}
</style>
