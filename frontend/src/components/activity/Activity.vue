<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useActivityStore } from "@/store/activity";
import TabContentWrapper from "../common/TabContentWrapper.vue";
import LoadingThrobber from "@/components/common/LoadingThrobber.vue";
import NestedDropdown from "@/components/common/dropdowns/NestedDropdown.vue";
import WsLabel from "../common/WsLabel.vue";
import Dropdown from "../common/Dropdown.vue";
import ActivityStatPanel from "./ActivityStatPanel.vue";
import { getSkills, getActivities } from "@/utils/axios/api_routes";
import { capitalize } from "@/utils/string";

const activityStore = useActivityStore();
const { activitySelected } = storeToRefs(activityStore);

const skillKey = ref(0);
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
  activitiesBySkill.value = categorized;
  isLoading.value = false;
});

const selectActivity = (activity) => {
  activityStore.loadActivity(activity.id);
};
</script>

<template>
  <tab-content-wrapper>
    <div v-if="isLoading">
      <loading-throbber />
    </div>
    <div v-else class="tab-content">
      <nested-dropdown
        label="Activity"
        :data="activitiesBySkill"
        @select="selectActivity"
      />
      <!-- <div class="row">
        <div class="label-wrapper">
          <ws-label class="label" label="Skill" />
          <dropdown
            :options="skills"
            :selected-option="activityStore.skill"
            @change="handleSkillChange"
          />
        </div>
      </div> -->
      <!-- <div class="row">
        <div class="label-wrapper">
          <ws-label class="label" label="Activity" />
          <dropdown
            :options="activities"
            :selected-option="activityStore.activity"
            @change="handleActivityChange"
          />
        </div>
      </div> -->
      <!-- <activity-stat-panel v-if="activitySelected" /> -->
    </div>
  </tab-content-wrapper>
</template>

<style lang="scss" scoped>
.tab-content {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  gap: $xlg;
}

.row {
  display: flex;
  align-items: center;
  gap: $base;
}

.label-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  gap: $xxs;
  .label {
    margin-left: $xxs;
  }
}
</style>