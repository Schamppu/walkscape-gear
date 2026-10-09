import { defineStore } from "pinia";
import {
  configStorageKey,
  defaultConfig,
  parseConfig,
  type AdvancedOptimiserConfig,
  type Target,
} from "@/domain/advancedOptimiser/config";

/**
 * Advanced Optimiser Store
 * Holds the advanced optimiser config per activity / recipe id, persisted to
 * localStorage under `advancedOptimiser.config.<id>` (`bestForSkill` configs
 * share `advancedOptimiser.bestForSkillConfig`).
 *
 * Storage can be unavailable (private mode, blocked site data); every access
 * is wrapped so the optimiser still works in memory.
 */

const readStored = (key: string): AdvancedOptimiserConfig | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const writeStored = (config: AdvancedOptimiserConfig): void => {
  try {
    localStorage.setItem(configStorageKey(config), JSON.stringify(config));
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

export const useAdvancedOptimiserStore = defineStore("advancedOptimiserStore", {
  state: () => ({
    configs: {} as Record<string, AdvancedOptimiserConfig>,
  }),
  actions: {
    /** Loads the saved config for an activity into memory, if there is one. */
    load(activityId: string): void {
      if (this.configs[activityId]) return;
      const stored = readStored(configStorageKey(defaultConfig(activityId)));
      if (stored?.mode.kind === "singleActivity" && stored.mode.activityId === activityId) {
        this.configs[activityId] = stored;
      }
    },
    getOrCreate(activityId: string): AdvancedOptimiserConfig {
      this.load(activityId);
      if (!this.configs[activityId]) {
        this.configs[activityId] = defaultConfig(activityId);
      }
      return this.configs[activityId];
    },
    addTarget(activityId: string, target: Target): void {
      this.getOrCreate(activityId).targets.push(target);
      this.save(activityId);
    },
    updateTarget(activityId: string, index: number, patch: Partial<Target>): void {
      const targets = this.getOrCreate(activityId).targets;
      if (!targets[index]) return;
      targets[index] = { ...targets[index], ...patch };
      this.save(activityId);
    },
    removeTarget(activityId: string, index: number): void {
      this.getOrCreate(activityId).targets.splice(index, 1);
      this.save(activityId);
    },
    /** Back to the default config, forgetting the saved one. */
    resetConfig(activityId: string): void {
      const config = defaultConfig(activityId);
      this.configs[activityId] = config;
      removeStored(configStorageKey(config));
    },
    save(activityId: string): void {
      const config = this.configs[activityId];
      if (config) writeStored(config);
    },
  },
});
