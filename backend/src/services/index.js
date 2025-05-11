import BaseService from "./baseService.js";
import IconService from "./iconService.js";
import SkillService from "./skillService.js";

const activityService = new BaseService("activities");
const buildingService = new BaseService("buildings");
const iconService = new IconService();
const itemService = new BaseService("items");
const keywordService = new BaseService("keywords");
const locationService = new BaseService("locations");
const lootTableService = new BaseService("loot_tables");
const recipeService = new BaseService("recipes");
const serviceService = new BaseService("services");
const shopService = new BaseService("shops");
const skillService = new SkillService();

export {
  activityService,
  buildingService,
  iconService,
  itemService,
  keywordService,
  locationService,
  lootTableService,
  recipeService,
  serviceService,
  shopService,
  skillService,
};
