import { defineStore } from "pinia";

/**
 * Session-only toggle state for pet active abilities.
 *
 * Active abilities are ENABLED BY DEFAULT once unlocked; this store tracks the
 * ids the user has explicitly toggled OFF. Passive abilities are always on and
 * are never tracked here. Not persisted — resets on reload.
 */
export const useAbilityToggleStore = defineStore("abilityToggleStore", {
  state: () => ({
    disabledActiveAbilities: new Set<string>(),
  }),
  getters: {
    isEnabled:
      (state) =>
      (id: string): boolean =>
        !state.disabledActiveAbilities.has(id),
    disabledIds: (state): Set<string> => state.disabledActiveAbilities,
  },
  actions: {
    toggle(id: string): void {
      if (this.disabledActiveAbilities.has(id)) {
        this.disabledActiveAbilities.delete(id);
      } else {
        this.disabledActiveAbilities.add(id);
      }
    },
    setEnabled(id: string, on: boolean): void {
      if (on) this.disabledActiveAbilities.delete(id);
      else this.disabledActiveAbilities.add(id);
    },
  },
});
