<script setup>
const props = defineProps({ tag: String });
</script>

<template>
  <span :class="`color-${props.tag}`">
    {{ props.tag }}
  </span>
</template>

<style lang="scss" scoped>
</style>
