<script setup>
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  settings: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update-setting-value", "update-setting-display"]);

function updateSettingValue(key, value) {
  emit("update-setting-value", key, value);
}

function updateSettingDisplay(key, display) {
  const isBool = typeof display === "boolean";
  const displayValue = isBool ? (display ? 1 : 0) : display;
  emit("update-setting-display", key, displayValue);
}

/**
 * Settings with both an enable toggle and a "Visible in UI" toggle.
 * Created by makeBoolSetting — no displayOptions, showEnable/showDisplay not overridden.
 */
const toggleWithVisibilitySettings = computed(() =>
  Object.entries(props.settings).filter(
    ([, s]) =>
      !s.displayOptions &&
      !("showEnable" in s && !s.showEnable) &&
      !("showDisplay" in s && !s.showDisplay),
  ),
);

/**
 * Settings that only expose a dropdown (no enable checkbox).
 * Created by makeDisplaySetting — has displayOptions and showEnable: false.
 */
const dropdownSettings = computed(() =>
  Object.entries(props.settings).filter(
    ([, s]) => s.displayOptions && "showEnable" in s && !s.showEnable,
  ),
);

/**
 * Settings with only an enable toggle and no display column.
 * Created by makeDebugSetting — has showDisplay: false.
 */
const toggleOnlySettings = computed(() =>
  Object.entries(props.settings).filter(
    ([, s]) => "showDisplay" in s && !s.showDisplay,
  ),
);
</script>

<template>
  <div class="settings-table-container">
    <h3>{{ title }}</h3>

    <!-- Toggle + Visible in UI -->
    <table v-if="toggleWithVisibilitySettings.length" class="settings-table">
      <thead>
        <tr>
          <th>Setting</th>
          <th>Enabled (Default)</th>
          <th>Visible in UI</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[key, setting] in toggleWithVisibilitySettings" :key="key">
          <td class="setting-label">{{ setting.label }}</td>
          <td class="setting-enabled">
            <input
              type="checkbox"
              :id="`${key}-value`"
              :checked="setting.value"
              @change="updateSettingValue(key, $event.target.checked)"
            />
          </td>
          <td class="setting-display">
            <input
              type="checkbox"
              :id="`${key}-display`"
              :checked="setting.display === 1"
              @change="updateSettingDisplay(key, $event.target.checked)"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Dropdown-only -->
    <table
      v-if="dropdownSettings.length"
      class="settings-table"
      :class="{ 'mt-table': toggleWithVisibilitySettings.length }"
    >
      <thead>
        <tr>
          <th>Setting</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[key, setting] in dropdownSettings" :key="key">
          <td class="setting-label">{{ setting.label }}</td>
          <td class="setting-display">
            <select
              :id="`${key}-display`"
              :value="setting.display"
              @change="updateSettingDisplay(key, parseInt($event.target.value))"
            >
              <option
                v-for="(option, idx) in setting.displayOptions"
                :key="option.value || option.name || idx"
                :value="idx"
              >
                {{ option.name || option }}
              </option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Toggle-only (no display column) -->
    <table
      v-if="toggleOnlySettings.length"
      class="settings-table"
      :class="{
        'mt-table':
          toggleWithVisibilitySettings.length || dropdownSettings.length,
      }"
    >
      <thead>
        <tr>
          <th>Setting</th>
          <th>Enabled</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[key, setting] in toggleOnlySettings" :key="key">
          <td class="setting-label">{{ setting.label }}</td>
          <td class="setting-enabled">
            <input
              type="checkbox"
              :id="`${key}-value`"
              :checked="setting.value"
              @change="updateSettingValue(key, $event.target.checked)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/mixins/settingsTableShared" as table;

.settings-table-container {
  h3 {
    @include table.settings-title;
  }

  .mt-table {
    margin-top: $base;
  }
}

.settings-table {
  @include table.settings-table;
}

// Screen reader only class for accessibility
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
