import { defineStore } from "pinia";
import { getSettings, upsertSettings } from "@/utils/axios/db_routes";
import { useNotificationStore } from "./notifications";
import {
  activityOptimiserPriorities,
  recipeOptimiserPriorities,
  thousandSeparators,
  decimalSeparators,
  undoRedoOptions,
  shownDropRateOptions,
} from "@/constants/settings";
import type { Setting } from "@/constants/settings";
import type {
  DbUserSettings,
  DbUserSetting,
  UpsertSettingEntry,
} from "@/domain/types/db";

/**
 * Purpose:
 * Store for user settings that are saved to
 * the backend and persist across sessions.
 * This includes both gear display settings
 * and activity/recipe display settings.
 *
 * Responsibilities:
 * - Fetch settings from backend on load and merge with defaults
 * - Provide default settings for all options
 * - Track changes to settings and only save changed settings to backend
 *
 * Does NOT:
 * - Store settings that are only relevant for the current session (e.g. temporary UI state)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SettingsGroupName = "gearSettings" | "activitySettings" | "toolSettings";
export type SettingsRecord = Record<string, Setting>;

/** Snapshot of the original persisted value for a setting, used to detect reverts. */
type TrackedSetting = DbUserSetting & { group: SettingsGroupName };

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = defineStore("settingsStore", {
  state: () => ({
    userSettings: {} as SettingsRecord,
    gearSettings: {} as SettingsRecord,
    activitySettings: {} as SettingsRecord,
    toolSettings: {} as SettingsRecord,
    isLoaded: false,
    changedSettings: new Map<string, TrackedSetting>(),
    saveTimeout: null as ReturnType<typeof setTimeout> | null,
  }),

  getters: {
    settingsGroups: (): SettingsGroupName[] => [
      "gearSettings",
      "activitySettings",
      "toolSettings",
    ],
  },

  actions: {
    /** Returns the live SettingsRecord for the given group name. */
    _group(name: SettingsGroupName): SettingsRecord {
      const map: Record<SettingsGroupName, SettingsRecord> = {
        gearSettings: this.gearSettings,
        activitySettings: this.activitySettings,
        toolSettings: this.toolSettings,
      };
      return map[name];
    },

    async fetchSettingsData(): Promise<void> {
      try {
        const defaultSettings = this.defaultSettingsData();
        this.settingsGroups.forEach((group) => {
          this._group(group);
          Object.assign(this[group], { ...defaultSettings[group] });
        });

        const backendSettings = await getSettings();
        this.mergeBackendSettings(backendSettings);
        this.changedSettings.clear();
        this.isLoaded = true;
      } catch (error) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to fetch settings from backend");
        console.error("Failed to fetch settings from backend:", error);
        const defaultSettings = this.defaultSettingsData();
        this.gearSettings = defaultSettings.gearSettings;
        this.activitySettings = defaultSettings.activitySettings;
        this.changedSettings.clear();
        this.isLoaded = true;
      }
    },

    mergeBackendSettings(backendSettings: DbUserSettings): void {
      Object.entries(backendSettings).forEach(([settingKey, settingData]) => {
        this.settingsGroups.forEach((group) => {
          const record = this._group(group);
          if (record[settingKey]) {
            record[settingKey].display = settingData.display;
            record[settingKey].value = settingData.value;
          }
        });
      });
    },

    async saveSettings(): Promise<void> {
      try {
        const changedSettingsArray = this.convertChangedSettingsToBackendFormat();
        if (changedSettingsArray.length === 0) return;

        await upsertSettings(changedSettingsArray);

        const notificationStore = useNotificationStore();
        notificationStore.success(
          `${changedSettingsArray.length} setting${
            changedSettingsArray.length > 1 ? "s" : ""
          } saved`,
        );

        this.changedSettings.clear();
      } catch (error) {
        const notificationStore = useNotificationStore();
        notificationStore.error("Failed to save settings");
        console.error("Failed to save settings:", error);
        throw error;
      }
    },

    debouncedSaveSettings(): void {
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(async () => {
        try {
          await this.saveSettings();
        } catch {
          // Error already handled in saveSettings
        }
      }, 2000);
    },

    markSettingChanged(
      settingKey: string,
      newValue?: boolean,
      newDisplay?: number,
    ): void {
      let current: Setting | undefined;
      let settingGroup: SettingsGroupName | undefined;

      this.settingsGroups.forEach((group) => {
        const record = this._group(group);
        if (record[settingKey]) {
          current = record[settingKey];
          settingGroup = group;
        }
      });

      if (!current || !settingGroup) return;

      if (!this.changedSettings.has(settingKey)) {
        this.changedSettings.set(settingKey, {
          group: settingGroup,
          display: current.display,
          value: current.value as boolean,
        });
      }

      const record = this._group(settingGroup);
      if (newValue !== undefined) {
        record[settingKey].value = newValue;
      } else if (newDisplay !== undefined) {
        record[settingKey].display = newDisplay;
      }

      const tracked = this.changedSettings.get(settingKey)!;
      const updated = record[settingKey];
      if (
        updated.display === tracked.display &&
        updated.value === tracked.value
      ) {
        this.changedSettings.delete(settingKey);
      }

      this.debouncedSaveSettings();
    },

    convertChangedSettingsToBackendFormat(): UpsertSettingEntry[] {
      const settingsArray: UpsertSettingEntry[] = [];
      this.changedSettings.forEach(({ group }, settingKey) => {
        const record = this._group(group);
        if (record[settingKey]) {
          settingsArray.push({
            setting: settingKey,
            display: record[settingKey].display,
            value: record[settingKey].value as boolean,
          });
        }
      });
      return settingsArray;
    },

    convertSettingsToBackendFormat(): UpsertSettingEntry[] {
      const settingsArray: UpsertSettingEntry[] = [];
      this.settingsGroups.forEach((group) => {
        Object.entries(this._group(group)).forEach(([key, setting]) => {
          settingsArray.push({
            setting: key,
            display: setting.display,
            value: setting.value as boolean,
          });
        });
      });
      return settingsArray;
    },

    defaultSettingsData(): Record<SettingsGroupName, SettingsRecord> {
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
            displayOptions: undoRedoOptions,
            value: true,
            showEnable: false,
          },
          activityOptimiserPriority: {
            label: "Activity optimiser priority",
            display: 0,
            displayOptions: activityOptimiserPriorities,
            value: true,
            showEnable: false,
          },
          recipeOptimiserPriority: {
            label: "Recipe optimiser priority",
            display: 0,
            displayOptions: recipeOptimiserPriorities,
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
            displayOptions: shownDropRateOptions,
            value: false,
            showEnable: false,
          },
          thousandSeparator: {
            label: "Thousand separator",
            display: 0,
            displayOptions: thousandSeparators,
            value: false,
            showEnable: false,
          },
          decimalSeparator: {
            label: "Decimal separator",
            display: 0,
            displayOptions: decimalSeparators,
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
