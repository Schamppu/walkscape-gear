import BaseService from "./baseService.js";
import IconService from "./iconService.js";
import SkillService from "./skillService.js";
import ItemService from "./itemService.js";

const achievementService = new BaseService("achievements");
const activityService = new BaseService("activities");
const buildingService = new BaseService("buildings");
const factionService = new BaseService("factions");
const iconService = new IconService();
const itemService = new ItemService();
const keywordService = new BaseService("keywords");
const locationService = new BaseService("locations");
const lootTableService = new BaseService("loot_tables");
const recipeService = new BaseService("recipes");
const routeService = new BaseService("routes");
const rewardsService = new BaseService("rewards");
const serviceService = new BaseService("services");
const shopService = new BaseService("shops");
const skillService = new SkillService();
const statService = new BaseService("stats");
const terrainModifierService = new BaseService("terrain_modifiers");

export {
  achievementService,
  activityService,
  buildingService,
  factionService,
  iconService,
  itemService,
  keywordService,
  locationService,
  lootTableService,
  recipeService,
  routeService,
  rewardsService,
  serviceService,
  shopService,
  skillService,
  statService,
  terrainModifierService,
};
