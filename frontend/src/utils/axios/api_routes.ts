import type { AxiosResponse } from "axios";
import { createProxyInstance, type ProxyRequest } from "./proxy";
import {
  AbilitySummary,
  ActivitySummary,
  ApInfo,
  Faction,
  IconBatchResponse,
  ItemCategoryGroup,
  ItemSummary,
  ItemValueMap,
  Keyword,
  LootTableSummary,
  PetDetail,
  PetSummary,
  RecipeSummary,
  RouteSummary,
  Skill,
  StatDefinition,
  TerrainModifier,
  AbilityDetail,
  LocationDetail,
  LootTableDetail,
  ServiceDetail,
  LocationSummary,
  ItemDetail,
  UrlMap,
  GlobalVariable,
} from "@/domain/types";

const rawProxy = createProxyInstance("/api");

/** Type-safe wrapper – the proxy always returns a promise for valid methods. */
function proxy<T>(request: ProxyRequest): Promise<AxiosResponse<T>> {
  return rawProxy(request) as Promise<AxiosResponse<T>>;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export function getIcon({
  iconPath,
}: {
  iconPath: string;
}): Promise<AxiosResponse<Blob>> {
  return proxy<Blob>({
    url: `icons/${iconPath}`,
    options: {
      responseType: "blob",
    },
  });
}

export function getIconsBatch({
  iconPaths,
}: {
  iconPaths: string[];
}): Promise<AxiosResponse<IconBatchResponse>> {
  return proxy<IconBatchResponse>({
    method: "POST",
    url: "icons/batch",
    options: { iconPaths },
  });
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

export function getAbilities(): Promise<AxiosResponse<AbilitySummary[]>> {
  return proxy<AbilitySummary[]>({
    url: "abilities",
  });
}

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
// Skills
// ---------------------------------------------------------------------------

export function getSkills(): Promise<AxiosResponse<Skill[]>> {
  return proxy<Skill[]>({
    url: "skills",
  });
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export function getFactions(): Promise<AxiosResponse<Faction[]>> {
  return proxy<Faction[]>({
    url: "factions",
  });
}

// ---------------------------------------------------------------------------
// Global variables
// ---------------------------------------------------------------------------

export function getGlobalVariables(): Promise<AxiosResponse<GlobalVariable[]>> {
  return proxy<GlobalVariable[]>({
    url: "global_variables",
  });
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export function getKeywords(): Promise<AxiosResponse<Keyword[]>> {
  return proxy<Keyword[]>({
    url: "keywords",
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function getCategorizedItems(): Promise<
  AxiosResponse<ItemCategoryGroup[]>
> {
  return proxy<ItemCategoryGroup[]>({
    url: "items/categorized_items",
  });
}

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

export function getMaterials(): Promise<AxiosResponse<ItemSummary[]>> {
  return proxy<ItemSummary[]>({
    url: "items/search",
    options: {
      params: { type: "material" },
    },
  });
}

export function getFineMaterials(): Promise<AxiosResponse<string[]>> {
  return proxy<string[]>({
    url: `items/fine_materials`,
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

export function getUrlMap(): Promise<AxiosResponse<UrlMap>> {
  return proxy<UrlMap>({
    url: "items/url_mapping",
  });
}

export function getItemValueMap(): Promise<AxiosResponse<ItemValueMap>> {
  return proxy<ItemValueMap>({
    url: "items/item_value_mapping",
  });
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export function getLocations(): Promise<AxiosResponse<LocationSummary[]>> {
  return proxy<LocationSummary[]>({
    url: "locations",
  });
}

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

export function getActivities(): Promise<AxiosResponse<ActivitySummary[]>> {
  return proxy<ActivitySummary[]>({
    url: "activities",
  });
}

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

export function getRecipes(): Promise<AxiosResponse<RecipeSummary[]>> {
  return proxy<RecipeSummary[]>({
    url: "recipes",
  });
}

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
// Stats
// ---------------------------------------------------------------------------

export function getStats(): Promise<AxiosResponse<StatDefinition[]>> {
  return proxy<StatDefinition[]>({
    url: "stats",
  });
}

// ---------------------------------------------------------------------------
// Loot tables
// ---------------------------------------------------------------------------

export function getLootTables(): Promise<AxiosResponse<LootTableSummary[]>> {
  return proxy<LootTableSummary[]>({
    url: "lootTables",
  });
}

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
// Routes & terrain
// ---------------------------------------------------------------------------

export function getRoutes(): Promise<AxiosResponse<RouteSummary[]>> {
  return proxy<RouteSummary[]>({
    url: "routes",
  });
}

export function getTerrainModifiers(): Promise<
  AxiosResponse<TerrainModifier[]>
> {
  return proxy<TerrainModifier[]>({
    url: "terrain_modifiers",
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
