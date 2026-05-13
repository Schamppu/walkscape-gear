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
  qoRecipeOptimiserPriorities,
} from "@/constants/settings";
import type { Setting, SettingOption } from "@/constants/settings";
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

export type SettingsGroupName =
  | "gearSettings"
  | "activitySettings"
  | "toolSettings";
export type SettingsRecord = Record<string, Setting>;

/** Snapshot of the original persisted value for a setting, used to detect reverts. */
type TrackedSetting = DbUserSetting & { group: SettingsGroupName };

// ---------------------------------------------------------------------------
// Setting group key lists
// These are the single source of truth for valid keys per group.
// Copy them directly into the backend ALLOWED_SETTINGS / DEBUG_SETTINGS sets
// when adding or renaming entries.
// ---------------------------------------------------------------------------

export const GEAR_SETTING_KEYS = [
  "showOwned",
  "showUseful",
  "openStatRequirements",
  "showUnmetRequirements",
  "hideInventoryAttr",
  "undoRedo",
  "activityOptimiserPriority",
  "recipeOptimiserPriority",
  "qoRecipeOptimiserPriority",
] as const;

export const ACTIVITY_SETTING_KEYS = [
  "showCombined",
  "hideOwnedCollectibles",
  "hideUnmetLevelActivities",
  "shownDropRate",
  "thousandSeparator",
  "decimalSeparator",
  "showChestLootTables",
] as const;

export const DEBUG_SETTING_KEYS = [
  "debugActivity",
  "debugData",
  "debugGear",
  "debugGearSet",
  "debugHistory",
  "debugIcon",
  "debugItems",
  "debugPlayer",
  "debugRoute",
  "debugSettings",
  "debugURL",
  "debugOptimiser",
] as const;

// ---------------------------------------------------------------------------
// Default-setting factory helpers
// ---------------------------------------------------------------------------

/** A plain boolean toggle (checkbox only, no display dropdown). */
function makeCheckboxSetting(
  label: string,
  value: boolean,
  display = 0,
): Setting<boolean> {
  return { label, display, value };
}

/**
 * A display-only dropdown — the enabled checkbox is hidden.
 * Used for settings whose only meaningful axis is which option is selected.
 */
function makeDisplaySetting(
  label: string,
  displayOptions: SettingOption[],
  display = 0,
  value = false,
): Setting<boolean> {
  return { label, display, displayOptions, value, showEnable: false };
}

/** A boolean toggle: disabled by default, display column hidden. */
function makeBoolSetting(label: string, value = false): Setting<boolean> {
  return { label, display: 0, showDisplay: false, value };
}

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
        void notificationStore.debug(
          "Settings: fetch error - falling back to defaults",
          [error instanceof Error ? error.message : String(error)],
        );
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
        const changedSettingsArray =
          this.convertChangedSettingsToBackendFormat();
        if (changedSettingsArray.length === 0) {
          void notificationStore.debug(
            "Settings: save triggered but no changes detected",
          );
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
          [
            {
              group: String(settingGroup),
              display: updated.display,
              value: updated.value,
            },
          ],
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
        gearSettings: Object.fromEntries([
          ["showOwned", makeCheckboxSetting("Show only owned items", true, 1)],
          [
            "showUseful",
            makeCheckboxSetting("Show items with applicable stats", true, 1),
          ],
          [
            "openStatRequirements",
            makeBoolSetting("Open stat requirements by default"),
          ],
          [
            "showUnmetRequirements",
            makeBoolSetting("Show items with unmet requirements"),
          ],
          [
            "hideInventoryAttr",
            makeBoolSetting("Hide items with only inventory space"),
          ],
          [
            "undoRedo",
            makeDisplaySetting(
              "Show undo/redo buttons",
              undoRedoOptions,
              2,
              true,
            ),
          ],
          [
            "activityOptimiserPriority",
            makeDisplaySetting(
              "Activity priority",
              activityOptimiserPriorities,
              0,
              true,
            ),
          ],
          [
            "recipeOptimiserPriority",
            makeDisplaySetting(
              "Recipe priority",
              recipeOptimiserPriorities,
              0,
              true,
            ),
          ],
          [
            "qoRecipeOptimiserPriority",
            makeDisplaySetting(
              "QO recipe priority",
              qoRecipeOptimiserPriorities,
              0,
              true,
            ),
          ]
        ]),

        activitySettings: Object.fromEntries([
          ["showCombined", makeCheckboxSetting("Show combined drops", true, 1)],
          [
            "hideOwnedCollectibles",
            makeCheckboxSetting("Hide owned collectibles", true, 1),
          ],
          [
            "hideUnmetLevelActivities",
            makeBoolSetting("Hide activities with unmet level requirements"),
          ],
          [
            "shownDropRate",
            makeDisplaySetting("Shown Drop Rate", shownDropRateOptions),
          ],
          [
            "thousandSeparator",
            makeDisplaySetting("Thousand separator", thousandSeparators),
          ],
          [
            "decimalSeparator",
            makeDisplaySetting("Decimal separator", decimalSeparators),
          ],
          [
            "showChestLootTables",
            makeBoolSetting("Show chest loot tables", true),
          ],
        ]),

        toolSettings: Object.fromEntries(
          (
            [
              ["debugActivity", "Activity, recipe & location selection"],
              ["debugData", "Abilities, keywords & loot tables"],
              ["debugGear", "Item loading & gear slot changes"],
              ["debugGearSet", "Gear set loading & saving"],
              ["debugHistory", "Undo / redo operations"],
              ["debugIcon", "Icon loading & caching"],
              ["debugItems", "Owned items & inventory sync"],
              ["debugPlayer", "Player stats & faction data"],
              ["debugRoute", "Route calculation"],
              ["debugSettings", "Settings state changes"],
              ["debugURL", "URL encoding & decoding"],
              ["debugOptimiser", "Optimiser operations"],
            ] as [string, string][]
          ).map(([key, label]) => [key, makeBoolSetting(label)]),
        ),
      };
    },
  },
});
