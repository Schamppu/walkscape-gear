<script setup>
import WsIcon from "@/components/primitives/WsIcon.vue";
import { usePlayerStore } from "@/store/player";

const props = defineProps({ skill: String });
const { skillsMap } = usePlayerStore();

const skillObj = skillsMap[props.skill];
</script>

<template>
  <span class="skill" :class="[`color-${props.skill}`]">
    <ws-icon :icon-path="skillObj.icon" size="xs" class="skill-icon" />
    {{ skillObj.name }}
  </span>
</template>

<style lang="scss" scoped>
.skill-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
