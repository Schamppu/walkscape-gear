<script setup>
import { ref } from "vue";
import GearSetExport from "./GearSetExport.vue";
import GearUnequipButton from "./GearUnequipButton.vue";

const notification = ref("");

function showNotification(text) {
  notification.value = text;
  setTimeout(() => {
    notification.value = "";
  }, 5000);
}
</script>

<template>
  <div class="buttons-section">
    <div class="buttons-wrapper">
      <gear-unequip-button @notification="showNotification" />
      <gear-set-export @notification="showNotification" />
    </div>
    <p v-if="notification">{{ notification }}</p>
  </div>
</template>

<style lang="scss" scoped>
.buttons-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sm;

  width: 100%;

  .buttons-wrapper {
    width: 100%;

    display: flex;
    justify-content: space-around;
    gap: $sm;
  }
}
</style>
