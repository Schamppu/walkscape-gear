import BaseService from "./baseService.js";
import IconService from "./iconService.js";
import SkillService from "./skillService.js";
import ItemService from "./itemService.js";
import LocationService from "./locationService.js";
import RecipeService from "./recipeService.js";
import PetsService from "./petsService.js";

const abilitiesService = new BaseService("abilities");
const achievementService = new BaseService("achievements");
const activityService = new BaseService("activities");
const buildingService = new BaseService("buildings");
const factionService = new BaseService("factions");
const globalVariableService = new BaseService("global_variables");
const iconService = new IconService();
const itemService = new ItemService();
const keywordService = new BaseService("keywords");
const locationService = new LocationService();
const lootTableService = new BaseService("loot_tables");
const petService = new PetsService();
const recipeService = new RecipeService();
const routeService = new BaseService("routes");
const rewardsService = new BaseService("rewards");
const serviceService = new BaseService("services");
const shopService = new BaseService("shops");
const skillService = new SkillService();
const statService = new BaseService("stats");
const terrainModifierService = new BaseService("terrain_modifiers");

export {
  abilitiesService,
  achievementService,
  activityService,
  buildingService,
  factionService,
  globalVariableService,
  iconService,
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
};
