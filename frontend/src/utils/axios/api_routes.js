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

export function getLocalization({ key, locale = en }) {
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

export function getItem({ id }) {
  return proxy({
    url: `items/id/${id}`,
  });
}

export function searchLocations({ activityList }) {
  return proxy({
    url: "locations/search",
    options: {
      params: { activityList, detailed: true },
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
    url: `activities/id/${id}`,
  });
}

export function getStats() {
  return proxy({
    url: "stats",
  });
}

export function getMultipleLootTables(ids) {
  return proxy({
    method: "POST",
    url: "loot_tables/multiple",
    options: {
      body: { ids },
    },
  });
}
