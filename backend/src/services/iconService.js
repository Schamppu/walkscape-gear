import cachedApi from "./cachedApi.js";

export default class IconService {
  async getIcon(iconPath) {
    const response = await cachedApi.get(`/icons/${iconPath}`, {
      responseType: "arraybuffer",
    });
    return response;
  }

  async getIconsBatch(iconPaths) {
    const response = await cachedApi.post(
      "/icons/batch",
      { iconPaths },
      { responseType: "json" },
    );
    return response.data;
  }
}
