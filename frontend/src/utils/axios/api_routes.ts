import type { AxiosResponse } from "axios";
import { createProxyInstance, type ProxyRequest } from "./proxy";
import getHost from "./getHost";
import {
  ActivitySummary,
  ApInfo,
  ItemSummary,
  PetDetail,
  PetSummary,
  RecipeSummary,
  AbilityDetail,
  LocationDetail,
  LootTableDetail,
  ServiceDetail,
  ItemDetail,
} from "@/domain/types";
import type { StaticBootstrap } from "@/domain/types/bootstrap";

const rawProxy = createProxyInstance("/api");

/** Type-safe wrapper – the proxy always returns a promise for valid methods. */
function proxy<T>(request: ProxyRequest): Promise<AxiosResponse<T>> {
  return rawProxy(request) as Promise<AxiosResponse<T>>;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/** All static game data needed at startup, in one request. */
export function getStaticBootstrap(): Promise<AxiosResponse<StaticBootstrap>> {
  return proxy<StaticBootstrap>({
    url: "bootstrap",
  });
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** URL of a game icon. Served with long-lived cache headers, so plain `<img>` tags reuse it. */
export function getIconUrl(iconPath: string): string {
  return `${getHost()}/api/icons/${encodeURI(iconPath)}`;
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

export function getLocalization({
  key,
  locale = "en",
}: {
  key: string;
  locale?: string;
}): Promise<AxiosResponse<string>> {
  return proxy<string>({
    url: "translate",
    options: { params: { key, locale } },
  });
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export function getMultipleAbilities(
  ids: string[],
): Promise<AxiosResponse<AbilityDetail[]>> {
  return proxy<AbilityDetail[]>({
    method: "POST",
    url: "abilities/multiple",
    options: {
      ids,
    },
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function getItems(): Promise<AxiosResponse<ItemSummary[]>> {
  return proxy<ItemSummary[]>({
    url: "items",
  });
}

export function getItem({
  id,
}: {
  id: string;
}): Promise<AxiosResponse<ItemDetail>> {
  return proxy<ItemDetail>({
    url: `items/${id}`,
  });
}

/** Detailed items in request order; ids the API doesn't know come back as null. */
export function getMultipleItems(
  ids: string[],
): Promise<AxiosResponse<(ItemDetail | null)[]>> {
  return proxy<(ItemDetail | null)[]>({
    method: "POST",
    url: "items/multiple",
    options: { ids },
  });
}

export function getNewItemIds(
  ids: string[],
): Promise<AxiosResponse<Record<string, string>>> {
  return proxy<Record<string, string>>({
    method: "POST",
    url: "items/ids",
    options: { ids },
  });
}

export function getOldItemIds(
  ids: string[],
): Promise<AxiosResponse<Record<string, string>>> {
  return proxy<Record<string, string>>({
    method: "POST",
    url: "items/ids",
    options: { ids, target: "old" },
  });
}

export function searchItems({
  types,
  gearType,
  search,
}: {
  types?: string;
  gearType?: string;
  search?: string;
}): Promise<AxiosResponse<ItemSummary[]>> {
  return proxy<ItemSummary[]>({
    url: "items/search",
    options: {
      params: { types, gearType, search },
    },
  });
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export function searchLocations({
  activityList,
  serviceList,
}: {
  activityList: string;
  serviceList: string;
}): Promise<AxiosResponse<LocationDetail[]>> {
  return proxy<LocationDetail[]>({
    url: "locations/search",
    options: {
      params: { activityList, serviceList, detailed: true },
    },
  });
}

export function getRealmDefaultLocations(): Promise<
  AxiosResponse<LocationDetail[]>
> {
  return proxy<LocationDetail[]>({
    url: "locations/realm_default_locations",
  });
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export function getActivity({
  id,
}: {
  id: string;
}): Promise<AxiosResponse<ActivitySummary>> {
  return proxy<ActivitySummary>({
    url: `activities/${id}`,
  });
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export function getRecipe({
  id,
}: {
  id: string;
}): Promise<AxiosResponse<RecipeSummary>> {
  return proxy<RecipeSummary>({
    url: `recipes/${id}`,
  });
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export function searchServices({
  skill,
}: {
  skill: string;
}): Promise<AxiosResponse<ServiceDetail[]>> {
  return proxy<ServiceDetail[]>({
    url: "services/search",
    options: {
      params: { relatedSkills: skill, detailed: true },
    },
  });
}

// ---------------------------------------------------------------------------
// Loot tables
// ---------------------------------------------------------------------------

export function getMultipleLootTables(
  ids: string[],
): Promise<AxiosResponse<LootTableDetail[]>> {
  return proxy<LootTableDetail[]>({
    method: "POST",
    url: "lootTables/multiple",
    options: {
      ids,
    },
  });
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export function getApInfo(): Promise<AxiosResponse<ApInfo>> {
  return proxy<ApInfo>({
    url: "achievements/ap",
  });
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

export function getPets(): Promise<AxiosResponse<PetSummary[]>> {
  return proxy<PetSummary[]>({
    url: "pets",
  });
}

export function getPet({
  id,
}: {
  id: string;
}): Promise<AxiosResponse<PetDetail>> {
  return proxy<PetDetail>({
    url: `pets/${id}`,
  });
}
