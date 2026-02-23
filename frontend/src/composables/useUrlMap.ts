import { computed } from "vue";
import { useUrlStore } from "@/store/url";
import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";
import {
  encodeGearLoadout,
  decodeGearLoadout,
  type DecodedLoadout,
} from "@/utils/urlEncoding";

/**
 * Composable for encoding and decoding gear loadouts into URL-friendly strings.
 *
 * Encoding uses a compact binary representation of item indices (9 bits each,
 * supporting up to 511 unique items per slot), packed and base64-encoded for
 * URL safety. The mapping of item IDs → indices lives in the url store.
 *
 * Returns:
 *   encodeGearLoadout — produce a base64 string for the current loadout.
 *   decodeGearLoadout — reconstruct a slot→id map from a base64 string.
 */
export function useUrlMap() {
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const urlStore = useUrlStore();

  const loadout = computed(() => ({
    ...gearStore.selectedGearset,
    activity: activityStore.activity,
    recipe: activityStore.recipe,
  }));

  const encode = (): string =>
    encodeGearLoadout(urlStore.order, loadout.value, urlStore.reverseMapping);

  const decode = (encoded: string): DecodedLoadout =>
    decodeGearLoadout(encoded, urlStore.order, urlStore.mapping);

  return {
    encodeGearLoadout: encode,
    decodeGearLoadout: decode,
  };
}
