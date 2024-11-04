<script setup>
const props = defineProps({
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
  <label v-if="labelFor" :for="labelFor" class="typography-label">
    {{ label }}
  </label>
  <label v-else class="typography-label">
    {{ label }}
  </label>
</template>