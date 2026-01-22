<script setup>
defineEmits(["open", "quick-set"]);
</script>

<template>
  <div class="buttons">
    <button class="border-common" @click="$emit('open')">Optimiser</button>
    <button class="quick-set" @click="$emit('quick-set')">Quick set</button>
  </div>
</template>

<style lang="scss" scoped>
.buttons {
  display: flex;
  gap: $lg;
  justify-content: center;
  margin: $sm 0;

  button {
    cursor: pointer;
    gap: $xs;
    border-radius: $sm;
    padding: $xxs $xs;

    &:hover,
    &:focus {
      background-color: $boxTransparentDarkOutline;
    }
  }

  .quick-set {
    color: $txPositive;
    border: 1px solid $txPositive;

    &:hover,
    &:focus {
      background-color: $txPositiveDark;
    }
  }
}
</style>
