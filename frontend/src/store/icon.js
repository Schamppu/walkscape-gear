import { defineStore } from "pinia";
import { getIcon, getIconsBatch } from "@/utils/axios/api_routes";
import debounce from "@/utils/debounce";

export const useIconStore = defineStore("iconStore", {
  state: () => ({
    iconCache: {},
    pendingIcons: new Set(),
    pendingResolvers: {},
  }),
  actions: {
    async loadIcon(path) {
      // If already cached, return immediately
      if (path in this.iconCache) return this.iconCache[path];

      // If already pending, return a promise that resolves when loaded
      if (this.pendingResolvers[path]) {
        return new Promise((resolve) => {
          this.pendingResolvers[path].push(resolve);
        });
      }

      // Otherwise, add to pending and set up resolver
      this.pendingIcons.add(path);
      this.pendingResolvers[path] = [];

      // Debounced batch fetch
      this._debouncedFetchIcons();

      // Return a promise that resolves when the icon is loaded
      return new Promise((resolve) => {
        this.pendingResolvers[path].push(resolve);
      });
    },

    _dataUrlToBlob(dataUrl) {
      const [header, base64] = dataUrl.split(",");
      const mimeMatch = header.match(/data:(.*);base64/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return new Blob([array], { type: mime });
    },

    async _fetchIcons() {
      const iconsToFetch = Array.from(this.pendingIcons);
      this.pendingIcons.clear();

      if (iconsToFetch.length === 0) return;

      if (iconsToFetch.length === 1) {
        // Fetch single icon
        const path = iconsToFetch[0];
        try {
          const response = await getIcon({ iconPath: path });
          const blob = response.data;
          const url = URL.createObjectURL(blob);
          this.iconCache[path] = url;
          (this.pendingResolvers[path] || []).forEach((resolve) =>
            resolve(url)
          );
        } catch (e) {
          (this.pendingResolvers[path] || []).forEach((resolve) =>
            resolve(null)
          );
        }
        delete this.pendingResolvers[path];
      } else {
        // Fetch batch
        try {
          const { data: icons } = await getIconsBatch({
            iconPaths: iconsToFetch,
          });
          Object.entries(icons).forEach(([path, data]) => {
            const blob = this._dataUrlToBlob(data);
            const url = URL.createObjectURL(blob);
            this.iconCache[path] = url;
            (this.pendingResolvers[path] || []).forEach((resolve) =>
              resolve(url)
            );
            delete this.pendingResolvers[path];
          });
          // For any not returned, resolve as null
          for (const path of iconsToFetch) {
            if (!(path in this.iconCache)) {
              (this.pendingResolvers[path] || []).forEach((resolve) =>
                resolve(null)
              );
              delete this.pendingResolvers[path];
            }
          }
        } catch (e) {
          // On error, resolve all as null
          console.log("Error fetching icons:", e);
          for (const path of iconsToFetch) {
            (this.pendingResolvers[path] || []).forEach((resolve) =>
              resolve(null)
            );
            delete this.pendingResolvers[path];
          }
        }
      }
    },

    _debouncedFetchIcons: debounce(function () {
      this._fetchIcons();
    }, 50),
  },
});
