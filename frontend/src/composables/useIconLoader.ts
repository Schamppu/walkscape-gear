import { computed, ref, watch, type Ref } from "vue";
import { getIconUrl } from "@/utils/axios/api_routes";

/**
 * Purpose:
 * Resolves an icon path to its URL and tracks the image's loading state.
 *
 * Responsibilities:
 * - Map icon paths to cacheable `/api/icons/...` URLs (the browser does the caching)
 * - Track loading/failed state from the `<img>` load and error events
 * - Skip the loading state for icons already loaded this session
 *
 * Does NOT:
 * - Perform rendering
 * - Contain component-specific accessibility behavior
 */

export type IconPathValue = string | null | undefined;

// URLs that have finished loading once; the browser serves them from cache after that.
const loadedUrls = new Set<string>();

export function useIconLoader(iconPath: Ref<IconPathValue>): {
  iconUrl: Ref<string | null>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
  onLoad: () => void;
  onError: () => void;
} {
  const iconUrl = computed<string | null>(() =>
    iconPath.value ? getIconUrl(iconPath.value) : null,
  );
  const loading = ref<boolean>(false);
  const failed = ref<boolean>(false);

  watch(
    iconUrl,
    (url) => {
      failed.value = false;
      loading.value = url !== null && !loadedUrls.has(url);
    },
    { immediate: true },
  );

  const onLoad = (): void => {
    if (iconUrl.value) loadedUrls.add(iconUrl.value);
    loading.value = false;
  };

  const onError = (): void => {
    loading.value = false;
    failed.value = true;
  };

  return {
    iconUrl,
    loading,
    failed,
    onLoad,
    onError,
  };
}
