<script setup>
import { useGearSetExport } from "@/utils/useGearSetExport";
import WsButton from "@/components/common/WsButton.vue";

const emit = defineEmits(["notification"]);
const { exportCode } = useGearSetExport();

function copyExportCode() {
  const code = exportCode();
  navigator.clipboard
    .writeText(code)
    .then(() => {
      emit("notification", "Export code copied to clipboard!");
    })
    .catch(() => {
      emit("notification", "Failed to copy export code");
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
