<script setup>
import { ref, onMounted } from "vue";
import { useActivityStore } from "@/store/activity";
import TabContentWrapper from "../common/TabContentWrapper.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import { getSkills, getActivities } from "@/utils/axios/api_routes";

const activityStore = useActivityStore();

const skills = ref([]);
const isLoading = ref(true);

const activitiesBySkill = ref([]);

onMounted(async () => {
  const [skillsResponse, activitiesResponse] = await Promise.all([
    getSkills(),
    getActivities(),
  ]);

  const { data: skillList } = skillsResponse;
  skills.value = skillList.map(({ name, id, icon }) => ({
    name,
    value: id,
    icon,
  }));

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

const selectActivity = (activity) => {
  activityStore.loadActivity(activity.id);
};
</script>

<template>
  <tab-content-wrapper :isLoading="isLoading">
    <nested-dropdown
      label="Activity"
      :data="activitiesBySkill"
      @select="selectActivity"
    />
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.details {
  width: 100%;
  text-align: start;
}
</style>