import BaseService from "./baseService.js";
import IconService from "./iconService.js";
import SkillService from "./skillService.js";

const activityService = new BaseService("activities");
const buildingService = new BaseService("buildings");
const iconService = new IconService();
const itemService = new BaseService("items");
const keywordService = new BaseService("keywords");
const locationService = new BaseService("locations");
const recipeService = new BaseService("recipes");
const serviceService = new BaseService("services");
const skillService = new SkillService();

export {
  activityService,
  buildingService,
  iconService,
  itemService,
  keywordService,
  locationService,
  recipeService,
  serviceService,
  skillService,
};
