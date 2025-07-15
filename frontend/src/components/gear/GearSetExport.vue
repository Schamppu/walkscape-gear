<script setup>
import { useGearSetExport } from "@/utils/useGearSetExport";
import { useNotificationStore } from "@/store/notifications";
import WsButton from "@/components/common/WsButton.vue";

const { exportCode } = useGearSetExport();
const notificationStore = useNotificationStore();

function copyExportCode() {
  const code = exportCode();
  navigator.clipboard
    .writeText(code)
    .then(() => {
      notificationStore.success("Export code copied to clipboard!");
    })
    .catch(() => {
      notificationStore.error("Failed to copy export code");
    });
}
</script>

<template>
  <ws-button
    @click="copyExportCode"
    text="Export"
    icon-path="assets/icons/text/button_icons/deposit.png"
  />
</template>
