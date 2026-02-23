import { defineStore } from "pinia";
import { getIcon, getIconsBatch } from "@/utils/axios/api_routes";
import debounce from "@/utils/debounce";

/**
 * Icon Store
 * Manages icon caching and batch fetching to optimize performance.
 * Icons are fetched in batches to reduce the number of network requests.
 * The store maintains a cache of loaded icons and a set of pending icons to be fetched.
 * When an icon is requested, it checks the cache first, then adds it to the pending set if not found.
 * A debounced function is used to batch fetch icons after a short delay.
 *
 * Example usage:
 * const iconStore = useIconStore();
 * const iconUrl = await iconStore.loadIcon("path/to/icon.png");
 *
 * The loadIcon method returns a promise that resolves to the icon URL once it's loaded, allowing
 * components to reactively update when the icon is available.
 * The store also handles errors gracefully, resolving to null if an icon cannot be loaded.
 * This approach significantly improves performance when multiple icons are needed, as it minimizes
 * the number of individual network requests and leverages caching effectively.
 */

type IconResolver = (url: string | null) => void;

/** Minimal interface used to type `this` inside the debounced action, avoiding a circular reference. */
interface IconStoreContext {
  _fetchIcons: () => Promise<void>;
}

export const useIconStore = defineStore("iconStore", {
  state: () => ({
    iconCache: {} as Record<string, string>,
    pendingIcons: new Set<string>(),
    pendingResolvers: {} as Record<string, IconResolver[]>,
  }),

  actions: {
    async loadIcon(path: string): Promise<string | null> {
      // If already cached, return immediately
      if (path in this.iconCache) return this.iconCache[path];

      // If already pending, return a promise that resolves when loaded
      if (this.pendingResolvers[path]) {
        return new Promise<string | null>((resolve) => {
          this.pendingResolvers[path].push(resolve);
        });
      }

      // Otherwise, add to pending and set up resolver
      this.pendingIcons.add(path);
      this.pendingResolvers[path] = [];

      // Debounced batch fetch
      this._debouncedFetchIcons();

      // Return a promise that resolves when the icon is loaded
      return new Promise<string | null>((resolve) => {
        this.pendingResolvers[path].push(resolve);
      });
    },

    _dataUrlToBlob(dataUrl: string): Blob {
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

    async _fetchIcons(): Promise<void> {
      const iconsToFetch = Array.from(this.pendingIcons);
      this.pendingIcons.clear();

      if (iconsToFetch.length === 0) return;

      if (iconsToFetch.length === 1) {
        // Fetch single icon
        const path = iconsToFetch[0];
        try {
          const response = await getIcon({ iconPath: path });
          const blob = response.data as Blob;
          const url = URL.createObjectURL(blob);
          this.iconCache[path] = url;
          (this.pendingResolvers[path] ?? []).forEach((resolve) => resolve(url));
        } catch (e) {
          console.error("Error fetching icon:", e);
          (this.pendingResolvers[path] ?? []).forEach((resolve) => resolve(null));
        }
        delete this.pendingResolvers[path];
      } else {
        // Fetch batch
        try {
          const { data: icons } = await getIconsBatch({ iconPaths: iconsToFetch });
          Object.entries(icons as Record<string, string>).forEach(([path, data]) => {
            const blob = this._dataUrlToBlob(data);
            const url = URL.createObjectURL(blob);
            this.iconCache[path] = url;
            (this.pendingResolvers[path] ?? []).forEach((resolve) => resolve(url));
            delete this.pendingResolvers[path];
          });
          // For any not returned, resolve as null
          for (const path of iconsToFetch) {
            if (!(path in this.iconCache)) {
              (this.pendingResolvers[path] ?? []).forEach((resolve) => resolve(null));
              delete this.pendingResolvers[path];
            }
          }
        } catch (e) {
          // On error, resolve all as null
          console.error("Error fetching icons:", e);
          for (const path of iconsToFetch) {
            (this.pendingResolvers[path] ?? []).forEach((resolve) => resolve(null));
            delete this.pendingResolvers[path];
          }
        }
      }
    },

    // Defined as a plain property so the debounce closure is shared across all calls.
    // Pinia will bind `this` correctly on first invocation.
    _debouncedFetchIcons: debounce(function (this: IconStoreContext) {
      void this._fetchIcons();
    }, 10),
  },
});
