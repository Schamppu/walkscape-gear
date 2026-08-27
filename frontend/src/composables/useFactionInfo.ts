/**
 * Purpose:
 * This composable exposes everything the UI needs to read, edit and persist the
 * player's faction progress: reputation per faction and discovered locations per
 * realm, plus generic faction display lookups.
 *
 * Responsibilities:
 * - Expose the factions that have a visible reputation track.
 * - Expose the realms (factions that own locations, carrying a location count).
 * - Read and write a faction's reputation and a realm's location count.
 * - Persist both to the backend, debounced.
 * - Resolve a faction's display info (name, icon, border colour) by faction id.
 *
 * Does NOT:
 * - Contain game calculations.
 * - Own any component-local UI state.
 */

import { computed, type ComputedRef } from "vue";
import { usePlayerStore, type FactionInfo } from "@/store/player";
import { useDataStore } from "@/store/data";
import {
  upsertFactionReputations,
  upsertPlayerStats,
} from "@/utils/axios/db_routes";
import { argbToRgba } from "@/utils/argbToRgba";
import debounce from "@/utils/debounce";
import type { Faction, Realm } from "@/domain/types";

const SAVE_DEBOUNCE_MS = 1000;

/** Realm location counts are persisted as the player stat `<realmId>Locations`. */
const locationStatKey = (realmId: string): string => `${realmId}Locations`;

export function useFactionInfo(): {
  reputationFactions: ComputedRef<Faction[]>;
  getReputation: (reputation: string) => number;
  setReputation: (reputation: string, value: number) => void;
  saveFactionReputations: () => void;
  realms: ComputedRef<Realm[]>;
  getRealm: (id: string) => Realm | null;
  getLocationCount: (id: string) => number;
  getRealmLocations: (id: string) => number;
  setRealmLocations: (id: string, value: number) => void;
  saveRealmLocations: () => void;
  getFaction: (id: string) => FactionInfo | Realm | null;
  getFactionName: (id: string) => string;
  getFactionColor: (id: string) => string | null;
} {
  const playerStore = usePlayerStore();
  const dataStore = useDataStore();

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

  // --- realm locations (keyed by realm `id`, which is a faction id) ---

  /** Realms the player can discover locations in, sorted by name. */
  const realms = computed<Realm[]>(() =>
    Object.values(dataStore.realmsMap).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  );

  const getRealm = (id: string): Realm | null => dataStore.realmsMap[id] ?? null;

  /** Total locations the realm contains, i.e. the maximum a player can discover. */
  const getLocationCount = (id: string): number =>
    dataStore.realmsMap[id]?.locationCount ?? 0;

  const getRealmLocations = (id: string): number =>
    playerStore.realmLocations[id] ?? 0;

  const setRealmLocations = (id: string, value: number): void => {
    playerStore.setRealmLocations(id, value);
  };

  /**
   * Debounced persist of every realm's location count as player stats. One timer
   * per composable instance, so a group of bubbles should share a single caller.
   */
  const saveRealmLocations = debounce(() => {
    const stats = Object.fromEntries(
      Object.entries(playerStore.realmLocations).map(([realmId, value]) => [
        locationStatKey(realmId),
        value,
      ]),
    );
    // The backend rejects a payload with no recognised stats.
    if (Object.keys(stats).length === 0) return;
    upsertPlayerStats(stats);
  }, SAVE_DEBOUNCE_MS);

  // --- faction display lookups (keyed by faction `id`) ---

  /** Prefers the richer realm entry, falling back to factions without locations. */
  const getFaction = (id: string): FactionInfo | Realm | null =>
    dataStore.realmsMap[id] ?? playerStore.factionsMap[id] ?? null;

  const getFactionName = (id: string): string => getFaction(id)?.name ?? id;

  const getFactionColor = (id: string): string | null => {
    const color = getFaction(id)?.color;
    return color ? argbToRgba(color) : null;
  };

  return {
    reputationFactions,
    getReputation,
    setReputation,
    saveFactionReputations,
    realms,
    getRealm,
    getLocationCount,
    getRealmLocations,
    setRealmLocations,
    saveRealmLocations,
    getFaction,
    getFactionName,
    getFactionColor,
  };
}
