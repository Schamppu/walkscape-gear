<script setup>
import { ref } from "vue";
import { useGearSetExport } from "@/utils/useGearSetExport";
import WsIcon from "@/components/common/WsIcon.vue";

const notification = ref("");
const { exportCode } = useGearSetExport();

function showNotification(text) {
  notification.value = text;
  setTimeout(() => {
    notification.value = "";
  }, 5000);
}

function copyExportCode() {
  const code = exportCode();
  navigator.clipboard
    .writeText(code)
    .then(() => {
      showNotification("Export code copied to clipboard!");
    })
    .catch((err) => {
      showNotification("Failed to copy export code");
    });
}
</script>

<template>
  <div class="export-wrapper">
    <button @click="copyExportCode" class="export-button">
      <ws-icon
        icon-path="assets/icons/text/button_icons/deposit.png"
        size="sm"
      />
      Export
    </button>
    <p v-if="notification">{{ notification }}</p>
  </div>
</template>

<style lang="scss" scoped>
.export-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sm;

  width: 100%;
}

.export-button {
  cursor: pointer;

  display: flex;
  align-items: center;
  align-self: center;
  gap: $xxxxs;
  padding: $xxs;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}
</style>
