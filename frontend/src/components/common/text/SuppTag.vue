<script setup>
import { getMainSkillRequirement } from "@/domain/requirements/requirementUtils";
import { usePlayerStore } from "@/store/player";
import WsIcon from "@/components/primitives/WsIcon.vue";

const { skillsMap } = usePlayerStore();

const props = defineProps({ k: String, data: Object });

console.log(props.data);

const determineValue = () => {
  if (!props.data) return props.k;
  if (props.k === "skill") {
    const skill = getMainSkillRequirement(props.data.requirements);
    const skillObj = skillsMap[skill];
    return { icon: skillObj.icon, value: skillObj.name };
  }
  return { value: props.k };
};
</script>

<template>
  <span>
    <ws-icon
      v-if="determineValue().icon"
      :icon-path="determineValue().icon"
      size="xs"
    />
    {{ determineValue().value }}
  </span>
</template>
