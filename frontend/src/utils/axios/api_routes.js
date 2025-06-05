import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

const proxy = ({ url, options = {} }) => {
  return axios.get(`${getHost()}/api/${url}`, options);
};

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

export function getKeyword({ id }) {
  return proxy({
    url: "keywords",
    options: { params: { id } },
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
