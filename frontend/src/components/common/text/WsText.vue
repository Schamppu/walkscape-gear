<script setup>
import { parseGameString } from "@/utils/stringTokenizer";
import SkillTag from "./SkillTag.vue";
import ObjectTag from "./ObjectTag.vue";
import TextHighlight from "./TextHighlight.vue";
import VariableTag from "./VariableTag.vue";

const props = defineProps({
  text: String,
  data: Object,
});

const tokens = parseGameString(props.text);

function resolveComponent(token) {
  switch (token.type) {
    case "variable":
      return VariableTag;
    case "skill":
      return SkillTag;
    case "object":
      return ObjectTag;
    case "hl":
      return TextHighlight;
    default:
      return "span";
  }
}

function getProps(token) {
  if (token.type === "skill") {
    return { skill: token.skill };
  }
  if (token.type === "object") {
    return { objectId: token.id, data: props.data };
  }
  if (token.type === "variable") {
    return { variable: token.name, data: props.data };
  }
  return {};
}

function renderText(token) {
  if (token.type === "text") {
    return token.value;
  }
  if (token.type === "hl") {
    return token.value;
  }
  return "";
}
</script>

<template>
  <span>
    <component
      v-for="(token, i) in tokens"
      :key="i"
      :is="resolveComponent(token)"
      v-bind="getProps(token)"
    >
      {{ renderText(token) }}
    </component>
  </span>
</template>

<style lang="scss" scoped></style>
