<script setup>
import { ref } from "vue";
import { injectBaseContext } from "@/composables/context/injectShared";
import { useGearSetExport } from "@/composables/useGearSetExport";
import { icons } from "@/constants/iconPaths";
import { useNotificationStore } from "@/store/notifications";
import WsButton from "@/components/primitives/WsButton.vue";
import ExportCodeModal from "./ExportCodeModal.vue";

const ctx = injectBaseContext();
const { exportCode } = useGearSetExport(ctx);
const notificationStore = useNotificationStore();

const showModal = ref(false);
const currentExportCode = ref("");

async function copyExportCode() {
  try {
    const code = await exportCode();
    await navigator.clipboard.writeText(code);
    notificationStore.success("Export code copied to clipboard!");
  } catch (error) {
    console.error("Export failed:", error);

    // If clipboard copy fails, try to get the export code and show modal
    try {
      currentExportCode.value = await exportCode();
      showModal.value = true;
      notificationStore.info(
        "Clipboard access failed. Export code displayed in modal.",
      );
    } catch (exportError) {
      console.error("Export code generation failed:", exportError);
      notificationStore.error("Failed to export gear set");
    }
  }
}
</script>

<template>
  <div>
    <ws-button
      @click="copyExportCode"
      text="Export"
      :icon-path="icons.deposit"
    />
    <export-code-modal v-model="showModal" :export-code="currentExportCode" />
  </div>
</template>
