import { createProxyInstance } from "./proxy";
const proxy = createProxyInstance("/api");

export function getIcon({ iconPath }) {
  return proxy({
    url: `icons/${iconPath}`,
    options: {
      responseType: "blob",
    },
  });
}

export function getIconsBatch({ iconPaths }) {
  return proxy({
    method: "POST",
    url: "icons/batch",
    options: { iconPaths },
  });
}

export function getLocalization({ key, locale = "en" }) {
  return proxy({
    url: "translate",
    options: { params: { key, locale } },
  });
}

export function getSkills() {
  return proxy({
    url: "skills",
  });
}

export function getFactions() {
  return proxy({
    url: "factions",
  });
}

export function getKeywords() {
  return proxy({
    url: "keywords",
  });
}

export function getCategorizedItems() {
  return proxy({
    url: "items/categorized_items",
  });
}

export function getItems() {
  return proxy({
    url: "items",
  });
}

export function getItem({ id }) {
  return proxy({
    url: `items/${id}`,
  });
}

export function getMaterials() {
  return proxy({
    url: "items/search",
    options: {
      params: { type: "material" },
    },
  });
}

export function getFineMaterials() {
  return proxy({
    url: `items/fine_materials`,
  });
}

export function getNewItemIds(ids) {
  return proxy({
    method: "POST",
    url: "items/ids",
    options: { ids },
  });
}

export function getOldItemIds(ids) {
  return proxy({
    method: "POST",
    url: "items/ids",
    options: { ids, target: "old" },
  });
}

export function getLocations() {
  return proxy({
    url: "locations",
  });
}

export function searchLocations({ activityList, serviceList }) {
  return proxy({
    url: "locations/search",
    options: {
      params: { activityList, serviceList, detailed: true },
    },
  });
}

export function searchItems({ types, gearType, search }) {
  return proxy({
    url: "items/search",
    options: {
      params: { types, gearType, search },
    },
  });
}

export function getActivities() {
  return proxy({
    url: "activities",
  });
}

export function getActivity({ id }) {
  return proxy({
    url: `activities/${id}`,
  });
}

export function getRecipes() {
  return proxy({
    url: "recipes",
  });
}

export function getRecipe({ id }) {
  return proxy({
    url: `recipes/${id}`,
  });
}

export function searchServices({ skill }) {
  return proxy({
    url: "services/search",
    options: {
      params: { relatedSkills: skill, detailed: true },
    },
  });
}

export function getStats() {
  return proxy({
    url: "stats",
  });
}

export function getLootTables() {
  return proxy({
    url: "lootTables",
  });
}

export function getMultipleLootTables(ids) {
  return proxy({
    method: "POST",
    url: "lootTables/multiple",
    options: {
      ids,
    },
  });
}

export function getRoutes() {
  return proxy({
    url: "routes",
  });
}

export function getTerrainModifiers() {
  return proxy({
    url: "terrain_modifiers",
  });
}

export function getApInfo() {
  return proxy({
    url: "achievements/ap",
  });
}

export function getUrlMap() {
  return proxy({
    url: "items/url_mapping",
  });
}
