import { defineStore } from "pinia";
import {
  configStorageKey,
  defaultConfig,
  legacyConfigStorageKey,
  parseConfig,
  sourceKey,
  type AdvancedOptimiserConfig,
  type OptimiserSource,
  type Target,
} from "@/domain/advancedOptimiser/config";
import {
  OPTIMISER_SETTINGS_STORAGE_KEY,
  parseOptimiserSettings,
  type OptimiserSettings,
} from "@/domain/advancedOptimiser/consumables";

/**
 * Advanced Optimiser Store
 * Holds the advanced optimiser config per activity / recipe, persisted to
 * localStorage under `advancedOptimiser.config.<activity|recipe>:<id>`.
 * Configs saved under the older `advancedOptimiser.config.<id>` key are moved
 * on first load.
 *
 * Storage can be unavailable (private mode, blocked site data); every access
 * is wrapped so the optimiser still works in memory.
 */

const readStored = (key: string, source: OptimiserSource): AdvancedOptimiserConfig | null => {
  try {
    const raw = localStorage.getItem(key);
    const config = raw ? parseConfig(JSON.parse(raw)) : null;
    return config?.mode.kind === "singleActivity" && config.mode.activityId === source.id
      ? config
      : null;
  } catch {
    return null;
  }
};

const writeStored = (source: OptimiserSource, config: AdvancedOptimiserConfig): void => {
  try {
    localStorage.setItem(configStorageKey(source), JSON.stringify(config));
  } catch {
    // Storage full or blocked: keep the in-memory config.
  }
};

const removeStored = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore: nothing to remove.
  }
};

const loadSettings = (): OptimiserSettings => {
  try {
    const raw = localStorage.getItem(OPTIMISER_SETTINGS_STORAGE_KEY);
    return parseOptimiserSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return parseOptimiserSettings(null);
  }
};

export const useAdvancedOptimiserStore = defineStore("advancedOptimiserStore", {
  state: () => ({
    configs: {} as Record<string, AdvancedOptimiserConfig>,
    /** Player-wide settings shared by the quick set and advanced optimiser. */
    settings: loadSettings(),
  }),
  actions: {
    /** Loads the saved config for a source into memory, if there is one. */
    load(source: OptimiserSource): void {
      const key = sourceKey(source);
      if (this.configs[key]) return;
      const stored = readStored(configStorageKey(source), source);
      if (stored) {
        this.configs[key] = stored;
        return;
      }
      // Older key without the activity / recipe kind: whichever loads it
      // first takes it over.
      const legacyKey = legacyConfigStorageKey(source.id);
      const legacy = readStored(legacyKey, source);
      if (legacy) {
        this.configs[key] = legacy;
        writeStored(source, legacy);
        removeStored(legacyKey);
      }
    },
    getOrCreate(source: OptimiserSource): AdvancedOptimiserConfig {
      this.load(source);
      const key = sourceKey(source);
      if (!this.configs[key]) {
        this.configs[key] = defaultConfig(source.id);
      }
      return this.configs[key];
    },
    addTarget(source: OptimiserSource, target: Target): void {
      this.getOrCreate(source).targets.push(target);
      this.save(source);
    },
    updateTarget(source: OptimiserSource, index: number, patch: Partial<Target>): void {
      const targets = this.getOrCreate(source).targets;
      if (!targets[index]) return;
      targets[index] = { ...targets[index], ...patch };
      this.save(source);
    },
    removeTarget(source: OptimiserSource, index: number): void {
      this.getOrCreate(source).targets.splice(index, 1);
      this.save(source);
    },
    /** Replaces the config for a source with a copy of `config`, and saves it. */
    setConfig(source: OptimiserSource, config: AdvancedOptimiserConfig): void {
      this.configs[sourceKey(source)] = {
        ...config,
        mode: { ...config.mode },
        targets: config.targets.map((t) => ({ ...t })),
      };
      this.save(source);
    },
    setPresetId(source: OptimiserSource, presetId: string): void {
      this.getOrCreate(source).presetId = presetId;
      this.save(source);
    },
    /** Forgets the saved config, so the source starts from its default again. */
    resetConfig(source: OptimiserSource): void {
      delete this.configs[sourceKey(source)];
      removeStored(configStorageKey(source));
    },
    updateSettings(patch: Partial<OptimiserSettings>): void {
      this.settings = parseOptimiserSettings({ ...this.settings, ...patch });
      try {
        localStorage.setItem(OPTIMISER_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Storage full or blocked: keep the in-memory settings.
      }
    },
    save(source: OptimiserSource): void {
      const config = this.configs[sourceKey(source)];
      if (config) writeStored(source, config);
    },
  },
});
