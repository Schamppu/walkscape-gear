import { defineStore } from "pinia";
import { isAxiosError } from "axios";
import { useNotificationStore } from "@/store/notifications";
import {
  getOptimiserPresets,
  upsertOptimiserPreset,
  deleteOptimiserPreset,
  reorderOptimiserPresets,
  getSettings,
  upsertSettings,
} from "@/utils/axios/db_routes";
import {
  BUILTIN_PRESETS,
  builtinPresetSlug,
  presetFromDb,
  userPresetDbId,
  type OptimiserPreset,
} from "@/domain/advancedOptimiser/presets";
import type { Target } from "@/domain/advancedOptimiser/config";
import type { UpsertOptimiserPresetPayload } from "@/domain/types/db";

/**
 * Optimiser Presets Store
 * The player's saved optimiser presets, and which built-in presets they have
 * hidden. Fetched from the backend on first use and kept in memory; changes
 * are saved straight away.
 *
 * Hidden built-ins are user settings `hideOptimiserPreset:<slug>`, read here
 * rather than through the settings store, which only knows its fixed keys.
 *
 * Does NOT:
 * - Hold the per-activity optimiser config (see the advanced optimiser store).
 * - Decide which presets apply to an activity (see `presets.ts`).
 */

const HIDE_SETTING_PREFIX = "hideOptimiserPreset:";

/** The backend's message for a rejected request (400 / 404), else `fallback`. */
const errorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error) || !error.response || error.response.status >= 500)
    return fallback;
  const message = (error.response.data as { error?: unknown } | undefined)
    ?.error;
  return typeof message === "string" ? message : fallback;
};

const isNotFound = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 404;

/** The fetch in progress, so callers opening the optimiser at once share it. */
let loading: Promise<void> | null = null;

export const useOptimiserPresetsStore = defineStore("optimiserPresetsStore", {
  state: () => ({
    /** The player's own presets, in their order. */
    userPresets: [] as OptimiserPreset[],
    /** Slugs of the built-in presets the player has hidden. */
    hiddenBuiltins: [] as string[],
    isLoaded: false,
  }),

  getters: {
    /** Every preset in display order: the player's own first, then the built-ins. */
    allPresets(state): OptimiserPreset[] {
      return [...state.userPresets, ...BUILTIN_PRESETS];
    },

    isHidden(state): (presetId: string) => boolean {
      return (presetId) => {
        const slug = builtinPresetSlug(presetId);
        return slug !== null && state.hiddenBuiltins.includes(slug);
      };
    },

    /** The presets to offer: `allPresets` without the hidden built-ins. */
    presets(): OptimiserPreset[] {
      return this.allPresets.filter((p) => !this.isHidden(p.id));
    },

    /** Finds any preset by id, hidden ones included. */
    findPreset(): (presetId: string) => OptimiserPreset | null {
      return (presetId) =>
        this.allPresets.find((p) => p.id === presetId) ?? null;
    },
  },

  actions: {
    /** Fetches the player's presets once. On failure only the built-ins are offered. */
    async ensureLoaded(): Promise<void> {
      if (this.isLoaded) return;
      loading ??= this._fetch().finally(() => {
        loading = null;
      });
      return loading;
    },

    async _fetch(): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        const [presets, settings] = await Promise.all([
          getOptimiserPresets(),
          getSettings(),
        ]);
        this.userPresets = presets.map(presetFromDb);
        this.hiddenBuiltins = Object.entries(settings)
          .filter(
            ([key, { value }]) => key.startsWith(HIDE_SETTING_PREFIX) && value,
          )
          .map(([key]) => key.slice(HIDE_SETTING_PREFIX.length));
        this.isLoaded = true;
        void notificationStore.debug(
          `Optimiser presets: loaded ${this.userPresets.length} presets, ${this.hiddenBuiltins.length} hidden built-ins`,
        );
      } catch (error) {
        notificationStore.error("Failed to load optimiser presets");
        console.error("Failed to load optimiser presets:", error);
      }
    },

    /** Overwrites one of the player's presets. Returns it, or `null` if saving failed. */
    async savePreset(
      presetId: string,
      name: string,
      targets: Target[],
    ): Promise<OptimiserPreset | null> {
      const id = userPresetDbId(presetId);
      if (id === null) return null;
      return this._upsert({ id, name, targets });
    },

    /** Saves a new preset at the top of the list. Returns it, or `null` if saving failed. */
    async saveAsNew(
      name: string,
      targets: Target[],
    ): Promise<OptimiserPreset | null> {
      return this._upsert({ name, targets });
    },

    async renamePreset(
      presetId: string,
      name: string,
    ): Promise<OptimiserPreset | null> {
      const preset = this.userPresets.find((p) => p.id === presetId);
      return preset ? this.savePreset(presetId, name, preset.targets) : null;
    },

    async _upsert(
      payload: UpsertOptimiserPresetPayload,
    ): Promise<OptimiserPreset | null> {
      const notificationStore = useNotificationStore();
      try {
        const preset = presetFromDb(await upsertOptimiserPreset(payload));
        const index = this.userPresets.findIndex((p) => p.id === preset.id);
        if (index >= 0) {
          this.userPresets[index] = preset;
        } else {
          this.userPresets.unshift(preset);
        }
        notificationStore.success(`Preset "${preset.name}" saved`);
        return preset;
      } catch (error) {
        notificationStore.error(errorMessage(error, "Failed to save preset"));
        console.error("Failed to save optimiser preset:", error);
        return null;
      }
    },

    /** Deletes one of the player's presets. Returns whether it is gone. */
    async deletePreset(presetId: string): Promise<boolean> {
      const id = userPresetDbId(presetId);
      if (id === null) return false;
      const notificationStore = useNotificationStore();
      try {
        await deleteOptimiserPreset(id);
      } catch (error) {
        // Already deleted elsewhere (another browser with the same UUID).
        if (!isNotFound(error)) {
          notificationStore.error(
            errorMessage(error, "Failed to delete preset"),
          );
          console.error("Failed to delete optimiser preset:", error);
          return false;
        }
      }
      this.userPresets = this.userPresets.filter((p) => p.id !== presetId);
      return true;
    },

    /**
     * Swaps two of the player's presets in the list. The picker shows only the
     * presets that apply, so its neighbours needn't be next to each other here.
     */
    async swapPresets(presetId: string, otherId: string): Promise<void> {
      const a = this.userPresets.findIndex((p) => p.id === presetId);
      const b = this.userPresets.findIndex((p) => p.id === otherId);
      if (a < 0 || b < 0 || a === b) return;

      const reordered = [...this.userPresets];
      [reordered[a], reordered[b]] = [reordered[b], reordered[a]];
      this.userPresets = reordered;
      try {
        await reorderOptimiserPresets(
          reordered.map((p) => userPresetDbId(p.id)!),
        );
      } catch (error) {
        // Likely out of sync with presets changed elsewhere: take the saved list.
        useNotificationStore().error(
          errorMessage(error, "Failed to reorder presets"),
        );
        console.error("Failed to reorder optimiser presets:", error);
        this.isLoaded = false;
        await this.ensureLoaded();
      }
    },

    /** Hides a built-in preset from the list, or shows it again. */
    async setBuiltinHidden(presetId: string, hidden: boolean): Promise<void> {
      const slug = builtinPresetSlug(presetId);
      if (slug === null) return;
      const previous = this.hiddenBuiltins;
      this.hiddenBuiltins = hidden
        ? [...new Set([...previous, slug])]
        : previous.filter((s) => s !== slug);
      try {
        await upsertSettings([
          {
            setting: `${HIDE_SETTING_PREFIX}${slug}`,
            value: hidden,
            display: 0,
          },
        ]);
      } catch (error) {
        this.hiddenBuiltins = previous;
        useNotificationStore().error(
          errorMessage(error, "Failed to save preset visibility"),
        );
        console.error("Failed to save optimiser preset visibility:", error);
      }
    },
  },
});
