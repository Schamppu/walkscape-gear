<script setup>
import { ref, computed } from "vue";
import TabContentWrapper from "./common/TabContentWrapper.vue";
import Dropdown from "./common/Dropdown.vue";
import { getSkills, search } from "../utils/axios/activities";

const skillKey = ref(0);
const chosenSkill = ref(null);
const skills = ref([]);

const chosenActivity = ref(null);
const activities = ref([]);

getSkills().then(({ data: skillList }) => {
  skills.value = skillList.map((skill) => ({
    name: skill,
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
  chosenSkill.value = skill;
  loadActivities({ skill: skill.name });
};

const handleActivityChange = (activity) => {
  // update activity
  chosenActivity.value = activity;

  // update selected skill to match
  const [skill] = activity.skills;
  chosenSkill.value = {
    name: skill,
    value: skill,
  };

  // force skill dropdown update
  skillKey.value = skillKey + 1;
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
          :selectedOption="chosenSkill"
          @change="handleSkillChange"
        />
      </div>
      <div class="row">
        <p>Activity:</p>
        <dropdown :options="activities" @change="handleActivityChange" />
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