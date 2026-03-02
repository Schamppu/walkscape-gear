<script setup>
import { useNotificationStore } from "@/store/notifications";
import { injectBaseContext } from "@/composables/context/injectShared";
import { useGearSetExport } from "@/composables/useGearSetExport";
import { icons } from "@/constants/iconPaths";
import WsButton from "@/components/primitives/WsButton.vue";

const notificationStore = useNotificationStore();
const ctx = injectBaseContext();
const { exportStoredGearSets } = useGearSetExport(ctx);

async function downloadAllGearSets() {
  try {
    const encodedGearSets = await exportStoredGearSets();
    const payload = JSON.stringify(encodedGearSets, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `walkscape-gear-sets-export-${timestamp}.json`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    URL.revokeObjectURL(url);
    notificationStore.success("Stored gear sets exported as file.");
  } catch (error) {
    console.error("Mass export failed:", error);
    notificationStore.error("Failed to export stored gear sets");
  }
}
</script>

<template>
  <div class="data-settings-container">
    <h3>Data Management</h3>

    <table class="settings-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="setting-label">Download all gear sets</td>
          <td class="setting-action">
            <ws-button
              text="Download"
              :icon-path="icons.deposit"
              @click="downloadAllGearSets"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/mixins/settingsTableShared" as table;

.data-settings-container {
  h3 {
    @include table.settings-title;
  }
}

.settings-table {
  @include table.settings-table(
    $label-width: 70%,
    $control-width: 30%,
    $striped-rows: false
  );
}
</style>
