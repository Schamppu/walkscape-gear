<script setup>
import { ref, computed } from "vue";
import { useActivityStore } from "@/stores/activity";
import TabContentWrapper from "./common/TabContentWrapper.vue";
import Dropdown from "./common/Dropdown.vue";
import { getSkills, search } from "@/utils/axios/activities";
import { capitalize } from "@/utils/string";

const activityStore = useActivityStore();

const skillKey = ref(0);
const skills = ref([]);

const activities = ref([]);

getSkills().then(({ data: skillList }) => {
  skills.value = skillList.map((skill) => ({
    name: capitalize(skill),
    value: skill,
  }));
});

const loadActivities = ({ skill, name } = {}) => {
  search({ skill, name }).then(({ data: activityList }) => {
    activities.value = activityList.map(({ name: activityName, skills }) => ({
      name: activityName,
      value: activityName,
      skills,
    }));
  });
};

loadActivities();

const handleSkillChange = (skill) => {
  activityStore.setSkill(skill);
  loadActivities({ skill: skill.value });
};

const handleActivityChange = (activity) => {
  // update activity
  activityStore.setActivity(activity);

  // update selected skill to match
  let skill;
  if (activity.value !== -1) [skill] = activity.skills;
  else skill = null;

  activityStore.setSkill({
    name: skill ? capitalize(skill) : "None",
    value: skill,
  });

  // force skill dropdown update
  skillKey.value = skillKey.value + 1;
};
</script>

<template>
  <tab-content-wrapper>
    <div class="tab-content">
      <div class="row">
        <p>Skill:</p>
        <dropdown
          :key="`skill-${skillKey}`"
          :options="skills"
          :selected-option="activityStore.skill"
          @change="handleSkillChange"
        />
      </div>
      <div class="row">
        <p>Activity:</p>
        <dropdown
          :options="activities"
          :selected-option="activityStore.activity"
          @change="handleActivityChange"
        />
      </div>
    </div>
  </tab-content-wrapper>
</template>

<style scoped>
.tab-content {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>