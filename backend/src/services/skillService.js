import cachedApi from "./cachedApi.js";

export default class SkillService {
  async list() {
    const response = await cachedApi.get(`/skills`);
    return response.data;
  }

  async get(skill) {
    const response = await cachedApi.get(`/skills/${skill}`);
    return response.data;
  }
}
