<script setup>
import { useGearSetExport } from "@/utils/useGearSetExport";
import { useNotificationStore } from "@/store/notifications";
import WsButton from "@/components/common/WsButton.vue";

const { exportCode } = useGearSetExport();
const notificationStore = useNotificationStore();

async function copyExportCode() {
  try {
    const code = await exportCode();
    await navigator.clipboard.writeText(code);
    notificationStore.success("Export code copied to clipboard!");
  } catch (error) {
    console.error("Export failed:", error);
    notificationStore.error("Failed to export gear set");
  }
}
</script>

<template>
  <ws-button
    @click="copyExportCode"
    text="Export"
    icon-path="assets/icons/text/button_icons/deposit.png"
  />
</template>
