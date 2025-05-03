import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

export function getIcon({ path }) {
  return axios.get(`${getHost()}icons`, {
    params: { path },
    responseType: "blob",
  });
}

export function getLocalization({ key, locale = en }) {
  return axios.get(`${getHost()}translate`, {
    params: { key, locale },
  });
}

export function getSkills() {
  return axios.get(`${getHost()}api/skills`);
}

export function getKeyword({ id }) {
  return axios.get(`${getHost()}keywords`, {
    params: { id },
  });
}

export function getItem({ name, id, quality }) {
  return axios.get(`${getHost()}items`, {
    params: { name, id, quality },
  });
}

export function searchItems({ types, gearType, search }) {
  return axios.get(`${getHost()}items/search`, {
    params: { types, gearType, search },
  });
}

export function getActivities({ skill }) {
  return axios.get(`${getHost()}api/activities/`, {
    params: { skill },
  });
}

export function getActivity({ id }) {
  return axios.get(`${getHost()}api/activities/id/${id}`);
}
