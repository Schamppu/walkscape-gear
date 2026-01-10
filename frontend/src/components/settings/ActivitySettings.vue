<script setup>
import { useSettingsStore } from "@/store/settings";
import SettingsTable from "./SettingsTable.vue";

const settingsStore = useSettingsStore();

function updateSettingValue(key, value) {
  settingsStore.markSettingChanged(key, value, undefined);
}

function updateSettingDisplay(key, display) {
  settingsStore.markSettingChanged(key, undefined, display);
}
</script>

<template>
  <settings-table
    title="Activity Settings"
    :settings="settingsStore.activitySettings"
    @update-setting-value="updateSettingValue"
    @update-setting-display="updateSettingDisplay"
  />
</template>
