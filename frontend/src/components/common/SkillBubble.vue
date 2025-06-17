<script setup>
import InfoBubble from "./InfoBubble.vue";

const props = defineProps({
  skill: {
    type: String,
    required: true,
  },
  text: String,
  useColorBorder: {
    type: Boolean,
    default: true,
  },
});

const iconPath =
  props.skill === "steps"
    ? "assets/icons/text/general_icons/steps.png"
    : props.skill === "xp"
    ? "assets/icons/text/stats/skilling/bonus_experience.png"
    : `assets/icons/text/skill_icons/${props.skill}.png`;
const borderClass =
  props.useColorBorder && props.skill !== "steps"
    ? `border-${props.skill}`
    : "";
</script>

<template>
  <info-bubble :icon-path="iconPath" :text="text" :class="borderClass" />
</template>

<style lang="scss" scoped></style>
