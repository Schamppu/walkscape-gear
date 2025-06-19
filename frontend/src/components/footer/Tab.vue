<script setup>
const props = defineProps({
  name: String,
  active: Boolean,
});

const emit = defineEmits(["click"]);
</script>

<template>
  <button :class="['tab', { active }]" @click="emit('click')">
    {{ name }}
  </button>
</template>

<style lang="scss" scoped>
.tab {
  width: 100%;
  padding: $lg;

  &:hover {
    background-color: $boxPrimaryBackground;
  }

  &.active {
    background-color: $chipBackground;
  }
}
</style>