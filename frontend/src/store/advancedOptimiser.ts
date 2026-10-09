import { defineStore } from "pinia";
import {
  defaultConfig,
  type AdvancedOptimiserConfig,
  type Target,
} from "@/domain/advancedOptimiser/config";

/**
 * Advanced Optimiser Store
 * Holds the advanced optimiser config per activity / recipe id.
 * In memory only for now; localStorage persistence comes later.
 */
export const useAdvancedOptimiserStore = defineStore("advancedOptimiserStore", {
  state: () => ({
    configs: {} as Record<string, AdvancedOptimiserConfig>,
  }),
  actions: {
    getOrCreate(activityId: string): AdvancedOptimiserConfig {
      if (!this.configs[activityId]) {
        this.configs[activityId] = defaultConfig(activityId);
      }
      return this.configs[activityId];
    },
    addTarget(activityId: string, target: Target): void {
      this.getOrCreate(activityId).targets.push(target);
    },
    updateTarget(activityId: string, index: number, patch: Partial<Target>): void {
      const targets = this.getOrCreate(activityId).targets;
      if (!targets[index]) return;
      targets[index] = { ...targets[index], ...patch };
    },
    removeTarget(activityId: string, index: number): void {
      this.getOrCreate(activityId).targets.splice(index, 1);
    },
  },
});
