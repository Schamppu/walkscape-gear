<script setup lang="ts">
defineProps({
  label: {
    type: String,
    required: true,
  },
  labelFor: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <label v-if="labelFor" :for="labelFor" class="typography-label clickable">
    {{ label }}
  </label>
  <label v-else class="typography-label">
    {{ label }}
  </label>
</template>

<style lang="scss" scoped>
.clickable {
  cursor: pointer;
}
</style>
