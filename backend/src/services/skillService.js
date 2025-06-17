import api from "./api.js";

export default class SkillService {
  constructor() {
    this.cache = {
      data: null,
      expiry: 0,
    };
    this.CACHE_DURATION_MS = 10 * 60 * 1000;
  }

  async list() {
    const now = Date.now();
    if (this.cache.data && this.cache.expiry > now) {
      return this.cache.data;
    }

    const response = await api.get(`/skills`);
    this.cache = {
      data: response.data,
      expiry: now + this.CACHE_DURATION_MS,
    };
    return response.data;
  }

  async get(skill) {
    const response = await api.get(`/skills/id/${skill}`);
    return response.data;
  }
}
