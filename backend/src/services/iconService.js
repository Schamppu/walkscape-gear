import api from "./api.js";

export default class IconService {
  async getIcon(iconPath) {
    const response = await api.get(`/icons/${iconPath}`, {
      responseType: "arraybuffer",
    });
    return response;
  }

  async getIconsBatch(iconPaths) {
    const response = await api.post(
      "/icons/batch",
      { iconPaths },
      { responseType: "json" }
    );
    return response.data;
  }
}
