import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

export function getSkills() {
  return axios.get(`${getHost()}activities/skills`);
}

export function search({ skill, name }) {
  return axios.get(`${getHost()}activities/search`, {
    params: { skill, name },
  });
}
