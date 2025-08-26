import { defineStore } from "pinia";
import { getSettings, upsertSettings } from "@/utils/axios/db_routes";
import { useNotificationStore } from "./notifications";

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    userSettings: {},
    gearSettings: {},
    activitySettings: {},
    isLoaded: false,
    changedSettings: new Map(),
    saveTimeout: null,
  }),
  actions: {
    async fetchSettingsData() {
      try {
        // Start with default settings
        const defaultSettings = this.defaultSettingsData();
        this.gearSettings = { ...defaultSettings.gearSettings };
        this.activitySettings = { ...defaultSettings.activitySettings };

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
        // Check if this setting exists in gearSettings
        if (this.gearSettings[settingKey]) {
          this.gearSettings[settingKey].display = settingData.display;
          this.gearSettings[settingKey].value = settingData.value;
        }
        // Check if this setting exists in activitySettings
        else if (this.activitySettings[settingKey]) {
          this.activitySettings[settingKey].display = settingData.display;
          this.activitySettings[settingKey].value = settingData.value;
        }
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
          } saved`
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
      if (this.gearSettings[settingKey]) {
        current = this.gearSettings[settingKey];
      } else if (this.activitySettings[settingKey]) {
        current = this.activitySettings[settingKey];
      } else {
        return; // Setting not found
      }

      // Check if we already have this setting tracked
      const tracked = this.changedSettings.get(settingKey);

      if (!tracked) {
        // First time changing this setting, track the ORIGINAL value (before any change)
        this.changedSettings.set(settingKey, {
          display: current.display,
          value: current.value,
        });
      }

      // Now update the actual setting
      if (this.gearSettings[settingKey]) {
        if (newValue !== undefined)
          this.gearSettings[settingKey].value = newValue;
        if (newDisplay !== undefined)
          this.gearSettings[settingKey].display = newDisplay;
      } else if (this.activitySettings[settingKey]) {
        if (newValue !== undefined)
          this.activitySettings[settingKey].value = newValue;
        if (newDisplay !== undefined)
          this.activitySettings[settingKey].display = newDisplay;
      }

      // After updating, check if we're back to the original values
      const trackedAfterUpdate = this.changedSettings.get(settingKey);
      const currentAfterUpdate =
        this.gearSettings[settingKey] || this.activitySettings[settingKey];

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

      // Only convert changed settings
      this.changedSettings.forEach((trackedValue, settingKey) => {
        // Check if this setting exists in gearSettings
        if (this.gearSettings[settingKey]) {
          settingsArray.push({
            setting: settingKey,
            display: this.gearSettings[settingKey].display,
            value: this.gearSettings[settingKey].value,
          });
        }
        // Check if this setting exists in activitySettings
        else if (this.activitySettings[settingKey]) {
          settingsArray.push({
            setting: settingKey,
            display: this.activitySettings[settingKey].display,
            value: this.activitySettings[settingKey].value,
          });
        }
      });

      return settingsArray;
    },

    convertSettingsToBackendFormat() {
      const settingsArray = [];

      // Convert gearSettings
      Object.entries(this.gearSettings).forEach(([key, setting]) => {
        settingsArray.push({
          setting: key,
          display: setting.display,
          value: setting.value,
        });
      });

      // Convert activitySettings
      Object.entries(this.activitySettings).forEach(([key, setting]) => {
        settingsArray.push({
          setting: key,
          display: setting.display,
          value: setting.value,
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
            label: "Show  items with applicable stats",
            display: 1,
            value: true,
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
        },
      };
    },
  },
});
