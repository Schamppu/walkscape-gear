import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

export function getIcon({ iconPath }) {
  return axios.get(`${getHost()}/icons/${iconPath}`, {
    responseType: "blob",
  });
}

export function getLocalization({ key, locale = en }) {
  return axios.get(`${getHost()}/translate`, {
    params: { key, locale },
  });
}

export function getSkills() {
  return axios.get(`${getHost()}/skills`);
}

export function getKeyword({ id }) {
  return axios.get(`${getHost()}/keywords`, {
    params: { id },
  });
}

export function getCollectibles() {
  return axios.get(`${getHost()}/items/collectibles`);
}

export function getCrafted() {
  return axios.get(`${getHost()}/items/crafted`);
}

export function getLoot() {
  return axios.get(`${getHost()}/items/loot`);
}

export function getItem({ name, id, quality }) {
  return axios.get(`${getHost()}/items`, {
    params: { name, id, quality },
  });
}

export function getActivityItems() {
  return axios.get(`${getHost()}/loot_tables/activity_items`);
}

export function getChestItems() {
  return axios.get(`${getHost()}/loot_tables/chest_items`);
}

export function getShops() {
  return axios.get(`${getHost()}/shops`);
}

export function getRewards() {
  return axios.get(`${getHost()}/rewards`);
}

export function getAchievementRewards() {
  return axios.get(`${getHost()}/achievements/item_rewards`);
}

export function searchItems({ types, gearType, search }) {
  return axios.get(`${getHost()}/items/search`, {
    params: { types, gearType, search },
  });
}

export function getActivities() {
  return axios.get(`${getHost()}/activities/`);
}

export function getActivity({ id }) {
  return axios.get(`${getHost()}/activities/id/${id}`);
}
