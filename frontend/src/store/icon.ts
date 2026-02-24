import { defineStore } from "pinia";
import { getIcon, getIconsBatch } from "@/utils/axios/api_routes";
import { useNotificationStore } from "@/store/notifications";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconResolver = (url: string | null) => void;

/** Minimal interface used to type `this` inside the debounced action, avoiding a circular reference. */
interface IconStoreContext {
  _fetchIcons: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Pure module-level helpers (no store state required)
// ---------------------------------------------------------------------------

/** Converts a base64 data URL to a Blob for use with URL.createObjectURL. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/** Calls all pending resolvers for a path and removes them from the map. */
function flushResolvers(
  resolvers: Record<string, IconResolver[]>,
  path: string,
  url: string | null,
): void {
  (resolvers[path] ?? []).forEach((resolve) => resolve(url));
  delete resolvers[path];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useIconStore = defineStore("iconStore", {
  state: () => ({
    iconCache: {} as Record<string, string>,
    pendingIcons: new Set<string>(),
    pendingResolvers: {} as Record<string, IconResolver[]>,
  }),

  actions: {
    async loadIcon(path: string): Promise<string | null> {
      if (path in this.iconCache) return this.iconCache[path];

      if (this.pendingResolvers[path]) {
        return new Promise<string | null>((resolve) => {
          this.pendingResolvers[path].push(resolve);
        });
      }

      this.pendingIcons.add(path);
      this.pendingResolvers[path] = [];
      this._debouncedFetchIcons();

      return new Promise<string | null>((resolve) => {
        this.pendingResolvers[path].push(resolve);
      });
    },

    async _fetchSingleIcon(path: string): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        const response = await getIcon({ iconPath: path });
        const url = URL.createObjectURL(response.data as Blob);
        this.iconCache[path] = url;
        void notificationStore.debug(`Icon: fetched single icon "${path}"`);
        flushResolvers(this.pendingResolvers, path, url);
      } catch (e) {
        console.error("Error fetching icon:", e);
        void notificationStore.debug(`Icon: failed to fetch single icon "${path}"`, [
          e instanceof Error ? e.message : String(e),
        ]);
        flushResolvers(this.pendingResolvers, path, null);
      }
    },

    async _fetchBatchIcons(paths: string[]): Promise<void> {
      const notificationStore = useNotificationStore();
      try {
        const { data: icons } = await getIconsBatch({ iconPaths: paths });
        const returned = Object.keys(icons as Record<string, string>);
        const missing = paths.filter((p) => !returned.includes(p));
        void notificationStore.debug(
          `Icon: batch response - ${returned.length}/${paths.length} icons returned` +
            (missing.length ? ` (${missing.length} missing)` : ""),
          missing.length ? [`Missing: ${missing.join(", ")}`] : [],
        );

        Object.entries(icons as Record<string, string>).forEach(([path, data]) => {
          const url = URL.createObjectURL(dataUrlToBlob(data));
          this.iconCache[path] = url;
          flushResolvers(this.pendingResolvers, path, url);
        });

        // Resolve any paths not present in the response as null
        for (const path of paths) {
          if (!(path in this.iconCache)) {
            flushResolvers(this.pendingResolvers, path, null);
          }
        }
      } catch (e) {
        console.error("Error fetching icons:", e);
        void notificationStore.debug(`Icon: batch fetch failed for ${paths.length} icons`, [
          e instanceof Error ? e.message : String(e),
        ]);
        for (const path of paths) {
          flushResolvers(this.pendingResolvers, path, null);
        }
      }
    },

    async _fetchIcons(): Promise<void> {
      const iconsToFetch = Array.from(this.pendingIcons);
      this.pendingIcons.clear();

      if (iconsToFetch.length === 0) return;

      if (iconsToFetch.length === 1) {
        await this._fetchSingleIcon(iconsToFetch[0]);
      } else {
        await this._fetchBatchIcons(iconsToFetch);
      }
    },

    // Defined as a plain property so the debounce closure is shared across all calls.
    // Pinia will bind `this` correctly on first invocation.
    _debouncedFetchIcons: debounce(function (this: IconStoreContext) {
      void this._fetchIcons();
    }, 10),
  },
});
