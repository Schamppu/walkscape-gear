<script setup>
const props = defineProps({
  name: String,
})

const emit = defineEmits(['click']);
</script>

<template>
  <button class="tab" @click="emit('click', name)">{{ name }}</button>
</template>

<style lang="scss" scoped>
@use "@/styles/utils/variables.scss";

.tab {                                     
  width: 100%;
  padding: variables.$xxxlg;
}

.tab:hover {
  background-color: variables.$boxPrimaryBackground;
}
</style>