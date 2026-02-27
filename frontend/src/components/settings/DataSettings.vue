<script setup>
import { useNotificationStore } from "@/store/notifications";
import { injectBaseContext } from "@/composables/context/injectShared";
import { useGearSetExport } from "@/composables/useGearSetExport";
import { icons } from "@/constants/iconPaths";
import WsButton from "@/components/common/WsButton.vue";

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
            <ws-button text="Download" :icon-path="icons.deposit" @click="downloadAllGearSets" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.data-settings-container {
  h3 {
    margin: 0 0 $base 0;
    color: $txPrimary;
  }
}

.settings-table {
  width: 100%;
  border-collapse: collapse;
  background: $bgPrimary;
  border-radius: $sm;
  overflow: hidden;
  border: 1px solid $boxDarkOutline;

  thead {
    background: $boxDarkBackground;

    th {
      padding: $sm $base;
      text-align: center;
      font-weight: bold;
      color: $txPrimary;
      border-bottom: 1px solid $boxDarkOutline;

      &:not(:last-child) {
        border-right: 1px solid $boxDarkOutline;
      }
    }
  }

  tbody {
    tr {
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    td {
      padding: $sm $base;
      color: $txPrimary;

      &:not(:last-child) {
        border-right: 1px solid rgba(255, 255, 255, 0.1);
      }

      &.setting-label {
        font-weight: 500;
        width: 70%;
      }

      &.setting-action {
        text-align: center;
        width: 30%;
      }
    }
  }
}
</style>
