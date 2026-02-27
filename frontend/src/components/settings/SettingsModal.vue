<script setup>
import { ref } from "vue";
import BaseModal from "../common/BaseModal.vue";
import UserSettings from "./UserSettings.vue";
import GearSettings from "./GearSettings.vue";
import DataSettings from "./DataSettings.vue";
import ActivitySettings from "./ActivitySettings.vue";
import ToolSettings from "./ToolSettings.vue";

const props = defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(["update:modelValue", "update-uuid"]);

const activeTab = ref("user");
const tabs = [
  { id: "user", label: "User", component: UserSettings },
  { id: "gear", label: "Gear", component: GearSettings },
  { id: "activity", label: "Activity", component: ActivitySettings },
  { id: "data", label: "Data", component: DataSettings },
  { id: "tool", label: "Tool", component: ToolSettings },
];

function setActiveTab(tabId) {
  activeTab.value = tabId;
}

function handleUpdateUuid(uuid) {
  emit("update-uuid", uuid);
}
</script>

<template>
  <base-modal
    :model-value="props.modelValue"
    title="Settings"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="settings-container">
      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="setActiveTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <component
          :is="tabs.find((tab) => tab.id === activeTab)?.component"
          @update-uuid="handleUpdateUuid"
        />
      </div>
    </div>
  </base-modal>
</template>

<style lang="scss" scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: $base;
  min-height: 300px;
}

.tab-navigation {
  display: flex;
  border-bottom: 1px solid $boxDarkOutline;
  overflow-x: auto;
  gap: 0;
}

.tab-button {
  background: transparent;
  border: none;
  padding: $sm $base;
  cursor: pointer;
  color: $txPrimary;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-size: $base;

  &:hover {
    color: $txPrimary;
    background: $boxTransparentDarkOutline;
  }

  &.active {
    color: $txPrimary;
    border-bottom-color: var(--color-primary, $txPrimary);
    background: rgba(255, 255, 255, 0.1);
  }

  &:first-child {
    border-top-left-radius: $sm;
  }

  &:last-child {
    border-top-right-radius: $sm;
  }
}

.tab-content {
  flex: 1;
  padding: $base 0;
}
</style>
