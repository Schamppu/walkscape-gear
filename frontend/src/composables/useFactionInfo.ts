/**
 * Purpose:
 * This composable exposes everything the UI needs to read, edit and persist faction
 * reputation, plus generic faction display lookups.
 *
 * Responsibilities:
 * - Expose the factions that have a visible reputation track.
 * - Read and write a single faction's reputation in the player store.
 * - Persist the whole reputation map to the backend, debounced.
 * - Resolve a faction's display info (name, icon, border colour) by faction id.
 *
 * Does NOT:
 * - Contain game calculations.
 * - Own any component-local UI state.
 */

import { computed, type ComputedRef } from "vue";
import { usePlayerStore, type FactionInfo } from "@/store/player";
import { upsertFactionReputations } from "@/utils/axios/db_routes";
import { argbToRgba } from "@/utils/argbToRgba";
import debounce from "@/utils/debounce";
import type { Faction } from "@/domain/types";

const SAVE_DEBOUNCE_MS = 1000;

export function useFactionInfo(): {
  reputationFactions: ComputedRef<Faction[]>;
  getReputation: (reputation: string) => number;
  setReputation: (reputation: string, value: number) => void;
  saveFactionReputations: () => void;
  getFaction: (id: string) => FactionInfo | null;
  getFactionName: (id: string) => string;
  getFactionColor: (id: string) => string | null;
} {
  const playerStore = usePlayerStore();

  /** Factions that have a visible reputation track. */
  const reputationFactions = computed<Faction[]>(
    () => playerStore.reputationFactions,
  );

  // --- reputation state (keyed by the faction's `reputation` string) ---

  const getReputation = (reputation: string): number =>
    playerStore.factionReputation[reputation] ?? 0;

  const setReputation = (reputation: string, value: number): void => {
    playerStore.setFactionReputation(reputation, value);
  };

  /**
   * Debounced persist of the whole reputation map. One timer per composable
   * instance, so a group of bubbles should share a single caller.
   */
  const saveFactionReputations = debounce(() => {
    upsertFactionReputations({ reputations: playerStore.factionReputation });
  }, SAVE_DEBOUNCE_MS);

  // --- faction display lookups (keyed by faction `id`) ---

  const getFaction = (id: string): FactionInfo | null =>
    playerStore.factionsMap[id] ?? null;

  const getFactionName = (id: string): string =>
    playerStore.factionsMap[id]?.name ?? id;

  const getFactionColor = (id: string): string | null => {
    const color = playerStore.factionsMap[id]?.color;
    return color ? argbToRgba(color) : null;
  };

  return {
    reputationFactions,
    getReputation,
    setReputation,
    saveFactionReputations,
    getFaction,
    getFactionName,
    getFactionColor,
  };
}
