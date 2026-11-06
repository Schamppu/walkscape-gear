import type { AbilitySummary } from "./ability";
import type { ActivitySummary } from "./activity";
import type {
  DbFactionReputations,
  DbGearSet,
  DbOwnedItem,
  DbPlayerStats,
  DbTag,
  DbUserSettings,
} from "./db";
import type { Faction } from "./faction";
import type { GlobalVariable } from "./global_variable";
import type { ItemCategoryGroup, ItemDetail, ItemValueMap, UrlMap } from "./item";
import type { Keyword } from "./keyword";
import type { LocationSummary } from "./location";
import type { LootTableSummary } from "./lootTable";
import type { RecipeSummary } from "./recipe";
import type { RouteSummary } from "./route";
import type { Skill } from "./skill";
import type { StatDefinition } from "./stat";
import type { TerrainModifier } from "./terrain";

/** Static game data served by `GET /api/bootstrap`. Same for every user. */
export interface StaticBootstrap {
  version: string;
  activities: ActivitySummary[];
  recipes: RecipeSummary[];
  abilities: AbilitySummary[];
  keywords: Keyword[];
  stats: StatDefinition[];
  lootTables: LootTableSummary[];
  locations: LocationSummary[];
  factions: Faction[];
  globalVariables: GlobalVariable[];
  itemValueMapping: ItemValueMap;
  skills: Skill[];
  urlMapping: UrlMap;
  categorizedItems: ItemCategoryGroup[];
  materials: ItemDetail[];
  containers: ItemDetail[];
  memospheres: ItemDetail[];
  fineMaterials: string[];
  routes: RouteSummary[];
  terrainModifiers: TerrainModifier[];
  gearSetTags: DbTag[];
}

/** Per-user data served by `GET /db/bootstrap`. */
export interface UserBootstrap {
  userStats: DbPlayerStats;
  ownedItems: DbOwnedItem[];
  factionReputations: DbFactionReputations;
  gearSets: DbGearSet[];
  userSettings: DbUserSettings;
}
