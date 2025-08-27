<script setup>
defineProps({
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
  emit("update-setting-display", key, display);
}
</script>

<template>
  <div class="settings-table-container">
    <h3>{{ title }}</h3>
    <table class="settings-table">
      <thead>
        <tr>
          <th>Setting</th>
          <th>Enabled (Default)</th>
          <th>Visible in UI</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(setting, key) in settings" :key="key">
          <td class="setting-label">
            {{ setting.label }}
          </td>
          <td class="setting-enabled">
            <input
              v-if="!('showEnable' in setting && !setting.showEnable)"
              type="checkbox"
              :id="`${key}-value`"
              :checked="setting.value"
              @change="updateSettingValue(key, $event.target.checked)"
            />
          </td>

          <td v-if="setting.displayOptions" class="setting-display">
            <select
              :id="`${key}-display`"
              :value="setting.display"
              @change="updateSettingDisplay(key, parseInt($event.target.value))"
            >
              <option
                v-for="(option, idx) in setting.displayOptions"
                :key="option"
                :value="idx"
              >
                {{ option }}
              </option>
            </select>
          </td>
          <td v-else class="setting-display">
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
  </div>
</template>

<style lang="scss" scoped>
.settings-table-container {
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
      text-align: left;
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
      &:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
      }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      &:not(:last-child) td {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
        width: 60%;
      }

      &.setting-enabled,
      &.setting-display {
        text-align: center;
        width: 20%;
      }
    }
  }

  input[type="checkbox"] {
    cursor: pointer;
    transform: scale(1.1);

    &:focus {
      outline: 2px solid var(--color-primary, $txPrimary);
      outline-offset: 2px;
    }
  }

  select {
    background: $bgPrimary;
    color: $txPrimary;
    border: 1px solid $boxDarkOutline;
    border-radius: $xs;
    padding: $xs $sm;
    cursor: pointer;
    font-size: inherit;

    &:focus {
      outline: 2px solid var(--color-primary, $txPrimary);
      outline-offset: 2px;
      border-color: var(--color-primary, $txPrimary);
    }

    option {
      background: $bgPrimary;
      color: $txPrimary;
    }
  }
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
