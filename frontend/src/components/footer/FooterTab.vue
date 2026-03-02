<script setup lang="ts">
import WsIcon from "../primitives/WsIcon.vue";

const props = defineProps({
  name: String,
  icon: String,
  active: Boolean,
});

defineEmits(["click"]);
</script>

<template>
  <button :class="['tab', { active }]" @click="$emit('click')">
    <ws-icon v-if="props.icon" :icon-path="props.icon" size="sm" />
    {{ props.name }}
  </button>
</template>

<style lang="scss" scoped>
.tab {
  width: 100%;
  display: flex;
  padding: $lg;
  gap: $sm;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: $boxPrimaryBackground;
  }

  &.active {
    background-color: $boxDarkBackground;
  }
}
</style>
