<script setup>
import WsIcon from "@/components/common/WsIcon.vue";

const props = defineProps({
  text: String,
  iconPath: String,
  iconSize: {
    type: String,
    default: "sm",
  },
});

const emit = defineEmits(["click"]);
</script>

<template>
  <button @click="$emit('click')" class="button">
    <ws-icon v-if="iconPath" :icon-path="iconPath" :size="iconSize" />
    {{ text }}
  </button>
</template>

<style lang="scss" scoped>
.button {
  cursor: pointer;

  display: flex;
  align-items: center;
  align-self: center;
  gap: $xxxxs;
  padding: $xxxs;

  word-wrap: nowrap;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
