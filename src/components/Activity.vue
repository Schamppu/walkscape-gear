<script setup>
import { ref, computed } from "vue";
import TabContentWrapper from "./common/TabContentWrapper.vue";
import Dropdown from "./common/Dropdown.vue";
import { getSkills } from "../utils/axios/activities";

const chosenSkill = ref(null);
const skills = ref([]);

getSkills().then(({ data: skillList }) => {
  skills.value = skillList.map((skill, index) => ({
    name: skill,
    value: index,
  }));
});

const activities = computed(() => {
  return [
    {
      name: "first value",
      value: 1,
    },
    {
      name: "second value",
      value: 2,
    },
    {
      name: "third value",
      value: 3,
    },
  ];
});

const handleSkillChange = (skill) => {
  chosenSkill.value = skill;
};
</script>

<template>
  <tab-content-wrapper>
    <div class="tab-content">
      <dropdown :options="skills" @change="handleSkillChange" />
    </div>
  </tab-content-wrapper>
</template>

<style scoped>
.tab-content {
}
</style>