import api from "./api.js";

export default class BaseService {
  constructor(resourceName) {
    this.resourceName = resourceName;
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

    const response = await api.get(`/${this.resourceName}`);
    this.cache = {
      data: response.data,
      expiry: now + this.CACHE_DURATION_MS,
    };
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/${this.resourceName}/${id}`);
    return response.data;
  }

  async getIds(ids) {
    const response = await api.post(
      `/${this.resourceName}/ids`,
      { ids },
      { responseType: "json" }
    );
    return response.data;
  }

  async search(params) {
    const response = await api.get(`/${this.resourceName}/search`, { params });
    return response.data;
  }
}
