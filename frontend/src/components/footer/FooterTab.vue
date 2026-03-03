<script setup lang="ts">
import WsIcon from "../primitives/WsIcon.vue";

const props = withDefaults(
  defineProps<{
    name?: string;
    icon?: string;
    active?: boolean;
  }>(),
  {
    active: false,
  },
);

const emit = defineEmits<{
  (event: "click"): void;
}>();
</script>

<template>
  <button
    :class="['tab', { active: props.active }]"
    :aria-current="props.active ? 'page' : undefined"
    @click="emit('click')"
  >
    <ws-icon v-if="props.icon" :icon-path="props.icon" size="sm" :decorative="true" />
    <span>{{ props.name }}</span>
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

  &:focus-visible {
    outline: 2px solid $boxDarkOutline;
    outline-offset: -2px;
  }
}
</style>
