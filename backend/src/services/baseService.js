import cachedApi from "./cachedApi.js";

export default class BaseService {
  constructor(resourceName) {
    this.resourceName = resourceName;
  }

  async list() {
    const response = await cachedApi.get(`/${this.resourceName}`);
    return response.data;
  }

  async getById(id) {
    const response = await cachedApi.get(`/${this.resourceName}/${id}`);
    return response.data;
  }

  async getMultiple(ids) {
    return Promise.all(ids.map((id) => this.getById(id)));
  }

  async getIds(ids, target) {
    const response = await cachedApi.post(
      `/${this.resourceName}/ids`,
      { ids, target },
      { responseType: "json" },
    );
    return response.data;
  }

  async search(params) {
    const response = await cachedApi.get(`/${this.resourceName}/search`, { params });
    return response.data;
  }
}
