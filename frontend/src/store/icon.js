import { defineStore } from "pinia";
import { getIcon } from "@/utils/axios/routes";

export const useIconStore = defineStore("iconStore", {
  state: () => ({
    iconCache: {},
  }),
  actions: {
    async loadIcon(path) {
      if (this.iconCache[path]) return this.iconCache[path];

      const response = await getIcon({ iconPath: path });
      const url = URL.createObjectURL(response.data);

      this.iconCache[path] = url;
      return url;
    },
  },
});
