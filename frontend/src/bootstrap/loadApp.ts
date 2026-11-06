import { getStaticBootstrap } from "@/utils/axios/api_routes";
import { getUserBootstrap } from "@/utils/axios/db_routes";
import type { StaticBootstrap, UserBootstrap } from "@/domain/types/bootstrap";
import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useGearSetStore } from "@/store/gearSet";
import { useItemsStore } from "@/store/items";
import { usePlayerStore } from "@/store/player";
import { useRouteStore } from "@/store/route";
import { useSettingsStore } from "@/store/settings";
import { useUrlStore } from "@/store/url";
import { useNotificationStore } from "@/store/notifications";

/**
 * Startup data loading. The app needs two requests:
 * - static game data (`/api/bootstrap`), loaded once per session
 * - the player's saved data (`/db/bootstrap`), reloaded when the uuid changes
 *
 * New startup data belongs in one of these bundles, not in a new store fetch.
 */

const EMPTY_USER_BUNDLE: UserBootstrap = {
  userStats: {},
  ownedItems: [],
  factionReputations: {},
  gearSets: [],
  userSettings: {},
};

let staticLoad: Promise<void> | null = null;

function hydrateStatic(data: StaticBootstrap): void {
  useActivityStore().hydrate(data);
  useDataStore().hydrate(data);
  usePlayerStore().hydrate(data);
  useUrlStore().hydrate(data);
  useItemsStore().hydrate(data);
  useGearSetStore().hydrate(data);
  useRouteStore().hydrate(data);
}

function hydrateUser(data: UserBootstrap): void {
  usePlayerStore().hydrateUser(data);
  useItemsStore().hydrateUser(data);
  useGearSetStore().hydrateUser(data);
  useSettingsStore().hydrateUser(data);
}

/** Loads static game data once; later calls reuse the same promise. */
export function loadStatic(): Promise<void> {
  staticLoad ??= getStaticBootstrap()
    .then(({ data }) => hydrateStatic(data))
    .catch((error: unknown) => {
      staticLoad = null;
      throw error;
    });
  return staticLoad;
}

async function fetchUserBundle(): Promise<UserBootstrap> {
  try {
    return await getUserBootstrap();
  } catch (error) {
    void useNotificationStore().error("Failed to load your saved data");
    console.error("Failed to load user bootstrap data:", error);
    return EMPTY_USER_BUNDLE;
  }
}

/**
 * Loads the current player's data. Static data is awaited first because the
 * user hydration builds on it (skills, factions, gear set tags).
 */
export async function loadUser(): Promise<void> {
  const [userBundle] = await Promise.all([fetchUserBundle(), loadStatic()]);
  hydrateUser(userBundle);
}
