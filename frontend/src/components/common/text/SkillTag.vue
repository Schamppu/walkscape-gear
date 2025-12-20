<script setup>
import WsIcon from "../WsIcon.vue";
import { usePlayerStore } from "@/store/player";

const props = defineProps({ skill: String });
const { skillsMap } = usePlayerStore();

const skillObj = skillsMap[props.skill];
</script>

<template>
  <span class="skill" :class="[`color-${props.skill}`]">
    <ws-icon :icon-path="skillObj.icon" size="xs" />
    {{ skillObj.name }}
  </span>
</template>
