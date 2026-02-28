import { ref, watch, type Ref } from "vue";
import { useIconStore } from "@/store/icon";

/**
 * Purpose:
 * Loads and tracks icon URLs from the icon store for a reactive icon path.
 *
 * Responsibilities:
 * - Keep icon loading state reactive
 * - Resolve icon URLs through the icon store
 * - Reset state safely when icon path is empty
 *
 * Does NOT:
 * - Perform rendering
 * - Contain component-specific accessibility behavior
 */

export type IconPathValue = string | null | undefined;

export function useIconLoader(iconPath: Ref<IconPathValue>): {
  iconUrl: Ref<string | null>;
  loading: Ref<boolean>;
} {
  const iconStore = useIconStore();
  const iconUrl = ref<string | null>(null);
  const loading = ref<boolean>(false);

  watch(
    iconPath,
    async (path) => {
      if (!path) {
        iconUrl.value = null;
        loading.value = false;
        return;
      }

      loading.value = true;
      iconUrl.value = await iconStore.loadIcon(path);
      loading.value = false;
    },
    { immediate: true },
  );

  return {
    iconUrl,
    loading,
  };
}