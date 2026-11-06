import { createHash } from "node:crypto";
import {
  abilitiesService,
  activityService,
  factionService,
  globalVariableService,
  itemService,
  keywordService,
  locationService,
  lootTableService,
  recipeService,
  routeService,
  skillService,
  statService,
  terrainModifierService,
} from "./index.js";
import * as dbService from "./dbService.js";

const STATIC_BUNDLE_TTL_MS = 15 * 60 * 1000;

// Last successfully built bundle: { json, etag, builtAt }
let staticBundle = null;
let building = null;

async function buildStaticPayload() {
  const sections = {
    activities: activityService.list(),
    recipes: recipeService.list(),
    abilities: abilitiesService.list(),
    keywords: keywordService.list(),
    stats: statService.list(),
    lootTables: lootTableService.list(),
    locations: locationService.list(),
    factions: factionService.list(),
    globalVariables: globalVariableService.list(),
    itemValueMapping: itemService.getItemValueMapping(),
    skills: skillService.list(),
    urlMapping: itemService.getUrlMapping(),
    categorizedItems: itemService.getCategorizedItems(),
    materials: itemService.search({ type: "material", detailed: true }),
    containers: itemService.search({ type: "container", detailed: true }),
    memospheres: itemService.search({ keywords: "memosphere", detailed: true }),
    fineMaterials: itemService.getFineMaterials(),
    routes: routeService.list(),
    terrainModifiers: terrainModifierService.list(),
    gearSetTags: dbService.getGearSetTags(),
  };

  const keys = Object.keys(sections);
  const values = await Promise.all(Object.values(sections));
  return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
}

async function rebuildStaticBundle() {
  const payload = await buildStaticPayload();
  const body = JSON.stringify(payload);
  const version = createHash("sha1").update(body).digest("hex");
  const json = JSON.stringify({ version, ...payload });
  staticBundle = { json, etag: `"${version}"`, builtAt: Date.now() };
  return staticBundle;
}

/**
 * Returns the pre-serialized static bundle. Rebuilds after the TTL; while a
 * rebuild is in flight (or if it fails) the previous bundle keeps being served.
 */
export async function getStaticBundle() {
  const isFresh =
    staticBundle && Date.now() - staticBundle.builtAt < STATIC_BUNDLE_TTL_MS;
  if (isFresh) return staticBundle;

  if (!building) {
    building = rebuildStaticBundle().finally(() => {
      building = null;
    });
  }

  if (staticBundle) {
    building.catch((error) => {
      console.error("[bootstrap] static bundle rebuild failed:", error);
    });
    return staticBundle;
  }

  return building;
}

export async function getUserBundle(userUuid) {
  const [userStats, ownedItems, factionReputations, gearSets, userSettings] =
    await Promise.all([
      dbService.getUserStats(userUuid),
      dbService.getUserOwnedItems(userUuid),
      dbService.getUserFactionReputations(userUuid),
      dbService.getGearSets(userUuid),
      dbService.getUserSettings(userUuid),
    ]);
  return { userStats, ownedItems, factionReputations, gearSets, userSettings };
}
