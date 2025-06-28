<script setup>
import { ref, onMounted, computed } from "vue";
import { useActivityStore } from "@/store/activity";
import { useUrlStore } from "@/store/url";
import {
  getSkills,
  getActivities,
  getKeywords,
} from "@/utils/axios/api_routes";
import TabContentWrapper from "../common/TabContentWrapper.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import ActivityInfo from "./ActivityInfo.vue";
import DropsInfo from "./DropsInfo.vue";

const activityStore = useActivityStore();
const urlStore = useUrlStore();

const skills = ref([]);
const keywords = ref([]);
const isLoading = ref(true);
const loadingActivity = ref(false);

const activitiesBySkill = ref([]);

onMounted(async () => {
  const [skillsResponse, activitiesResponse, keywordsResponse] =
    await Promise.all([getSkills(), getActivities(), getKeywords()]);

  const { data: skillList } = skillsResponse;
  skills.value = skillList.map(({ name, id, icon }) => ({
    name,
    value: id,
    icon,
  }));

  const { data: keywordList } = keywordsResponse;
  keywords.value = keywordList;

  const { data: activities } = activitiesResponse;

  const noneActivity = activities
    .filter(({ id }) => id === "activity-none")
    .map((item) => {
      return { ...item, value: item.name, items: [] };
    })[0];
  const categorized = skillList.map((skill) => {
    const { id, name: value } = skill;
    return {
      ...skill,
      value,
      items: activities
        .filter(({ relatedSkillsList }) => {
          return relatedSkillsList.length && relatedSkillsList[0] === id;
        })
        .map((item) => {
          return {
            ...item,
            value: item.name,
          };
        }),
    };
  });
  activitiesBySkill.value = [noneActivity, ...categorized];
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
</script>

<template>
  <tab-content-wrapper :isLoading="isLoading">
    <nested-dropdown
      label="Activity"
      :data="activitiesBySkill"
      v-model="selectedActivity"
      @select="updateActivityAndUrl"
    />
    <activity-info
      v-if="!loadingActivity && activityStore.activitySelected"
      :activity="activityStore.activity"
      :keywords="keywords"
      :locations="activityStore.locations"
    />
    <drops-info
      v-if="!loadingActivity && activityStore.activitySelected"
      :activity="activityStore.activity"
    />
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.details {
  width: 100%;
  text-align: start;
}
</style>
