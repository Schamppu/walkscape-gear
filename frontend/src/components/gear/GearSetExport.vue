<script setup>
import { ref } from "vue";
import { useGearSetExport } from "@/utils/useGearSetExport";
import WsButton from "@/components/common/WsButton.vue";

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
    <ws-button
      @click="copyExportCode"
      text="Export"
      icon-path="assets/icons/text/button_icons/deposit.png"
    />
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
</style>
