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
      const notificationStore = useNotificationStore();
      try {
        const defaultSettings = this.defaultSettingsData();
        this.settingsGroups.forEach((group) => {
          this._group(group);
          Object.assign(this[group], { ...defaultSettings[group] });
        });
        void notificationStore.debug("Settings: defaults applied", [
          this.settingsGroups.map((g) => ({
            group: g,
            keys: Object.keys(this._group(g) ?? {}).join(", ") || "(none)",
          })),
        ]);

        const backendSettings = await getSettings();
        void notificationStore.debug("Settings: fetched from backend", [
          typeof backendSettings === "object" && backendSettings !== null
            ? Object.keys(backendSettings).length + " entries"
            : "(empty response)",
        ]);
        this.mergeBackendSettings(backendSettings);
        this.changedSettings.clear();
        this.isLoaded = true;
      } catch (error) {
        notificationStore.error("Failed to fetch settings from backend");
        void notificationStore.debug("Settings: fetch error - falling back to defaults", [
          error instanceof Error ? error.message : String(error),
        ]);
        console.error("Failed to fetch settings from backend:", error);
        const defaultSettings = this.defaultSettingsData();
        this.gearSettings = defaultSettings.gearSettings;
        this.activitySettings = defaultSettings.activitySettings;
        this.changedSettings.clear();
        this.isLoaded = true;
      }
    },

    mergeBackendSettings(backendSettings: DbUserSettings): void {
      const notificationStore = useNotificationStore();
      const merged: string[] = [];
      const skipped: string[] = [];

      Object.entries(backendSettings).forEach(([settingKey, settingData]) => {
        let wasMatched = false;
        this.settingsGroups.forEach((group) => {
          const record = this._group(group);
          if (record[settingKey]) {
            record[settingKey].display = settingData.display;
            record[settingKey].value = settingData.value;
            wasMatched = true;
          }
        });
        if (wasMatched) {
          merged.push(settingKey);
        } else {
          skipped.push(settingKey);
        }
      });

      void notificationStore.debug(
        `Settings: merged ${merged.length} backend settings` +
          (skipped.length ? `, ${skipped.length} unrecognised` : ""),
        [
          merged.length ? `Merged: ${merged.join(", ")}` : null,
          skipped.length ? `Unrecognised: ${skipped.join(", ")}` : null,
        ].filter(Boolean),
      );
    },

    async saveSettings(): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        const changedSettingsArray = this.convertChangedSettingsToBackendFormat();
        if (changedSettingsArray.length === 0) {
          void notificationStore.debug("Settings: save triggered but no changes detected");
          return;
        }

        void notificationStore.debug(
          `Settings: saving ${changedSettingsArray.length} changed setting${changedSettingsArray.length > 1 ? "s" : ""}`,
          [
            changedSettingsArray.map((s) => ({
              key: String(s?.setting ?? "?"),
              display: s?.display,
              value: s?.value,
            })),
          ],
        );

        await upsertSettings(changedSettingsArray);

        notificationStore.success(
          `${changedSettingsArray.length} setting${
            changedSettingsArray.length > 1 ? "s" : ""
          } saved`,
        );

        this.changedSettings.clear();
      } catch (error) {
        notificationStore.error("Failed to save settings");
        void notificationStore.debug("Settings: save error", [
          error instanceof Error ? error.message : String(error),
        ]);
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
      const notificationStore = useNotificationStore();
      let current: Setting | undefined;
      let settingGroup: SettingsGroupName | undefined;

      this.settingsGroups.forEach((group) => {
        const record = this._group(group);
        if (record[settingKey]) {
          current = record[settingKey];
          settingGroup = group;
        }
      });

      if (!current || !settingGroup) {
        void notificationStore.debug(
          `Settings: unrecognised setting key "${String(settingKey)}" - change ignored`,
        );
        return;
      }

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
        void notificationStore.debug(
          `Settings: "${String(settingKey)}" reverted to original value - removed from pending saves`,
        );
      } else {
        void notificationStore.debug(
          `Settings: "${String(settingKey)}" changed`,
          [{
            group: String(settingGroup),
            display: updated.display,
            value: updated.value,
          }],
        );
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
          debugActivity: {
            label: "Activity, recipe & location selection",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugData: {
            label: "Abilities, keywords & loot tables",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugGear: {
            label: "Item loading & gear slot changes",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugGearSet: {
            label: "Gear set loading & saving",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugHistory: {
            label: "Undo / redo operations",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugIcon: {
            label: "Icon loading & caching",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugItems: {
            label: "Owned items & inventory sync",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugPlayer: {
            label: "Player stats & faction data",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugRoute: {
            label: "Route calculation",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugSettings: {
            label: "Settings state changes",
            display: 0,
            showDisplay: false,
            value: false,
          },
          debugURL: {
            label: "URL encoding & decoding",
            display: 0,
            showDisplay: false,
            value: false,
          },
        },
      };
    },
  },
});
