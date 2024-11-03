<script setup>
import { ref, computed } from "vue";
import { useActivityStore } from "../stores/activity";
import TabContentWrapper from "./common/TabContentWrapper.vue";
import Dropdown from "./common/Dropdown.vue";
import { getSkills, search } from "../utils/axios/activities";

const activityStore = useActivityStore();

const skillKey = ref(0);
const skills = ref([]);

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
  activityStore.setSkill(skill);
  loadActivities({ skill: skill.name });
};

const handleActivityChange = (activity) => {
  // update activity
  activityStore.setActivity(activity);

  // update selected skill to match
  const [skill] = activity.skills;

  activityStore.setSkill({
    name: skill,
    value: skill,
  });

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
          :selectedOption="activityStore.skill"
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