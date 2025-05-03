import api from "./api.js";

export default class IconService {
  async getIcon(iconPath) {
    const response = await api.get(`/icons/${iconPath}`, {
      responseType: "arraybuffer",
    });
    return response;
  }
}
