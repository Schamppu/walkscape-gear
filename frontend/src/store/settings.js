import { defineStore } from "pinia";
import { getSettings, upsertSettings } from "@/utils/axios/db_routes";
import { useNotificationStore } from "./notifications";
import {
  activityOptimiserPriorities,
  recipeOptimiserPriorities,
} from "@/constants/optimiserPriorities";
import { thousandSeparators, decimalSeparators } from "@/constants/separators";

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    userSettings: {},
    gearSettings: {},
    activitySettings: {},
    toolSettings: {},
    isLoaded: false,
    changedSettings: new Map(),
    saveTimeout: null,
  }),
  getters: {
    settingsGroups: () => ["gearSettings", "activitySettings", "toolSettings"],
  },

  actions: {
    async fetchSettingsData() {
      try {
        // Start with default settings
        const defaultSettings = this.defaultSettingsData();
        this.settingsGroups.forEach((group) => {
          this[group] = { ...defaultSettings[group] };
        });

        // Fetch settings from backend
        const backendSettings = await getSettings();

        // Override defaults with backend settings
        this.mergeBackendSettings(backendSettings);

        // Clear any pending changes since we just loaded from backend
        this.changedSettings.clear();

        this.isLoaded = true;
      } catch (error) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to fetch settings from backend");
        console.error("Failed to fetch settings from backend:", error);
        // Fall back to default settings
        const defaultSettings = this.defaultSettingsData();
        this.gearSettings = defaultSettings.gearSettings;
        this.activitySettings = defaultSettings.activitySettings;
        this.changedSettings.clear();
        this.isLoaded = true;
      }
    },

    mergeBackendSettings(backendSettings) {
      // Backend format: { setting: { display, value } }
      // Merge with existing settings structure
      Object.entries(backendSettings).forEach(([settingKey, settingData]) => {
        this.settingsGroups.forEach((group) => {
          if (this[group][settingKey]) {
            this[group][settingKey].display = settingData.display;
            this[group][settingKey].value = settingData.value;
          }
        });
      });
    },

    async saveSettings() {
      try {
        // Only save changed settings
        const changedSettingsArray =
          this.convertChangedSettingsToBackendFormat();

        if (changedSettingsArray.length === 0) {
          return;
        }

        await upsertSettings(changedSettingsArray);

        const notificationStore = useNotificationStore();
        notificationStore.success(
          `${changedSettingsArray.length} setting${
            changedSettingsArray.length > 1 ? "s" : ""
          } saved`,
        );

        // Clear changed settings after successful save
        this.changedSettings.clear();
      } catch (error) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to save settings");
        console.error("Failed to save settings:", error);
        throw error;
      }
    },

    debouncedSaveSettings() {
      // Clear existing timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      // Set new timeout for 2 seconds
      this.saveTimeout = setTimeout(async () => {
        try {
          await this.saveSettings();
        } catch {
          // Error already handled in saveSettings method
        }
      }, 2000);
    },

    markSettingChanged(settingKey, newValue, newDisplay) {
      // Get current setting values (before the change)
      let current;
      let settingGroup;
      this.settingsGroups.forEach((group) => {
        if (this[group][settingKey]) {
          current = this[group][settingKey];
          settingGroup = group;
        }
      });
      if (!current) return;

      // Check if we already have this setting tracked
      const tracked = this.changedSettings.get(settingKey);

      if (!tracked) {
        // First time changing this setting, track the ORIGINAL value (before any change)
        this.changedSettings.set(settingKey, {
          group: settingGroup,
          display: current.display,
          value: current.value,
        });
      }

      if (newValue !== undefined) {
        this[settingGroup][settingKey].value = newValue;
      } else if (newDisplay !== undefined) {
        this[settingGroup][settingKey].display = newDisplay;
      }

      // After updating, check if we're back to the original values
      const trackedAfterUpdate = this.changedSettings.get(settingKey);
      const currentAfterUpdate = this[settingGroup][settingKey];

      if (
        trackedAfterUpdate &&
        currentAfterUpdate.display === trackedAfterUpdate.display &&
        currentAfterUpdate.value === trackedAfterUpdate.value
      ) {
        // We're back to the original values, remove from tracking
        this.changedSettings.delete(settingKey);
      }

      this.debouncedSaveSettings();
    },

    convertChangedSettingsToBackendFormat() {
      const settingsArray = [];

      this.changedSettings.forEach(({ group }, settingKey) => {
        if (this[group][settingKey]) {
          settingsArray.push({
            setting: settingKey,
            display: this[group][settingKey].display,
            value: this[group][settingKey].value,
          });
        }
      });

      return settingsArray;
    },

    convertSettingsToBackendFormat() {
      const settingsArray = [];

      this.settingsGroups.forEach((group) => {
        Object.entries(this[group]).forEach(([key, setting]) => {
          settingsArray.push({
            setting: key,
            display: setting.display,
            value: setting.value,
          });
        });
      });

      return settingsArray;
    },

    defaultSettingsData() {
      return {
        gearSettings: {
          showOwned: {
            label: "Show only owned items",
            display: 1,
            value: true,
          },
          showUseful: {
            label: "Show items with applicable stats",
            display: 1,
            value: true,
          },
          openStatRequirements: {
            label: "Open stat requirements by default",
            showDisplay: false,
            display: 0,
            value: false,
          },
          undoRedo: {
            label: "Show undo/redo buttons",
            display: 2,
            displayOptions: ["Hidden", "Gear Tab", "Static buttons"],
            value: true,
            showEnable: false,
          },
          activityOptimiserPriority: {
            label: "Activity optimiser priority",
            display: 0,
            displayOptions: activityOptimiserPriorities.map(({ name }) => name),
            value: true,
            showEnable: false,
          },
          recipeOptimiserPriority: {
            label: "Recipe optimiser priority",
            display: 0,
            displayOptions: recipeOptimiserPriorities.map(({ name }) => name),
            value: true,
            showEnable: false,
          },
        },
        activitySettings: {
          showCombined: {
            label: "Show combined drops",
            display: 1,
            value: true,
          },
          hideOwnedCollectibles: {
            label: "Hide owned collectibles",
            display: 1,
            value: true,
          },
          shownDropRate: {
            label: "Shown Drop Rate",
            display: 0,
            displayOptions: ["Steps per Item", "Steps per Normal"],
            value: false,
            showEnable: false,
          },
          thousandSeparator: {
            label: "Thousand separator",
            display: 0,
            displayOptions: thousandSeparators.map(({ name }) => name),
            value: false,
            showEnable: false,
          },
          decimalSeparator: {
            label: "Decimal separator",
            display: 0,
            displayOptions: decimalSeparators.map(({ name }) => name),
            value: false,
            showEnable: false,
          },
        },
        toolSettings: {
          enableDebug: {
            label: "Show Debug Messages",
            showDisplay: false,
            display: 0,
            value: false,
          },
        },
      };
    },
  },
});
