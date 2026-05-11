import {
  abilitiesService,
  achievementService,
  activityService,
  buildingService,
  factionService,
  globalVariableService,
  itemService,
  keywordService,
  locationService,
  lootTableService,
  petService,
  recipeService,
  routeService,
  rewardsService,
  serviceService,
  shopService,
  skillService,
  statService,
  terrainModifierService,
} from "./index.js";
import cachedApi from "./cachedApi.js";

async function runStep(label, fn) {
  const start = Date.now();
  try {
    await fn();
    console.log(`[warmCache] ✓ ${label} (${Date.now() - start}ms)`);
  } catch (error) {
    console.warn(
      `[warmCache] ✗ ${label}: ${error?.message || error} (${Date.now() - start}ms)`,
    );
  }
}

export async function warmCache() {
  const start = Date.now();
  console.log("[warmCache] starting upstream prefetch");

  const baseLists = [
    ["abilities.list", () => abilitiesService.list()],
    ["achievements.list", () => achievementService.list()],
    ["activities.list", () => activityService.list()],
    ["buildings.list", () => buildingService.list()],
    ["factions.list", () => factionService.list()],
    ["global_variables.list", () => globalVariableService.list()],
    ["keywords.list", () => keywordService.list()],
    ["locations.list", () => locationService.list()],
    ["loot_tables.list", () => lootTableService.list()],
    ["pets.list", () => petService.list()],
    ["recipes.list", () => recipeService.list()],
    ["routes.list", () => routeService.list()],
    ["rewards.list", () => rewardsService.list()],
    ["services.list", () => serviceService.list()],
    ["shops.list", () => shopService.list()],
    ["skills.list", () => skillService.list()],
    ["stats.list", () => statService.list()],
    ["terrain_modifiers.list", () => terrainModifierService.list()],
  ];

  for (const [label, fn] of baseLists) {
    await runStep(label, fn);
  }

  const aggregations = [
    ["items.getCategorizedItems", () => itemService.getCategorizedItems()],
    ["items.getUrlMapping", () => itemService.getUrlMapping()],
    ["items.getItemValueMapping", () => itemService.getItemValueMapping()],
    ["items.getFineMaterials", () => itemService.getFineMaterials()],
    ["pets.fetchPets", () => petService.fetchPets()],
    ["locations.getRealmDefaultLocations", () =>
      locationService.getRealmDefaultLocations(),
    ],
  ];

  for (const [label, fn] of aggregations) {
    await runStep(label, fn);
  }

  const stats = await cachedApi.getCacheStats();
  console.log(
    `[warmCache] done in ${Date.now() - start}ms — upstream calls: ${stats.upstreamCalls}, hits: ${stats.hits}, json cache: ${stats.jsonCacheSize}, icon cache: ${stats.iconCacheSize}`,
  );
}
