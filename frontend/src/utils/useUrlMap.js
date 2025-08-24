import { computed } from "vue";
import { useUrlStore } from "@/store/url";
import { useGearStore } from "@/store/gear";
import { useActivityStore } from "@/store/activity";

export function useUrlMap() {
  const gearStore = useGearStore();
  const activityStore = useActivityStore();
  const urlStore = useUrlStore();

  const loadout = computed(() => {
    return {
      ...gearStore.gearSlots,
      activity: activityStore.activity,
      recipe: activityStore.recipe,
    };
  });

  function encodeLoadout(indices, bitsPerItem) {
    const bitString = indices
      .map((i) => i.toString(2).padStart(bitsPerItem, "0"))
      .join("");

    const byteArray = new Uint8Array(Math.ceil(bitString.length / 8));

    for (let i = 0; i < byteArray.length; i++) {
      const byteBits = bitString.slice(i * 8, (i + 1) * 8).padEnd(8, "0");
      byteArray[i] = parseInt(byteBits, 2);
    }

    return btoa(String.fromCharCode(...byteArray));
  }

  const encodeGearLoadout = () => {
    const slotOrder = urlStore.order;

    const numbers = Object.entries(slotOrder).map(([slot, slotName]) => {
      const itemId = loadout.value[slot]?.id || null;
      if (!itemId) {
        return 0;
      }

      return urlStore.reverseMapping[slotName][itemId] ?? 0;
    });

    return encodeLoadout(numbers, 9);
  };

  function decodeLoadout(encoded, bitsPerItem, numItems) {
    const binaryStr = atob(encoded)
      .split("")
      .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    const indices = [];
    for (let i = 0; i < numItems; i++) {
      const bits = binaryStr.slice(i * bitsPerItem, (i + 1) * bitsPerItem);
      indices.push(parseInt(bits, 2));
    }

    return indices;
  }
  const decodeGearLoadout = (encoded) => {
    const slotOrder = urlStore.order;
    const numbers = decodeLoadout(encoded, 9, Object.keys(slotOrder).length);
    const loadout = {};

    Object.entries(slotOrder).forEach(([slot, slotName], i) => {
      const chunk = numbers[i];
      if (chunk === 0) {
        loadout[slot] = null;
        return;
      }
      loadout[slot] = urlStore.mapping[slotName][chunk] ?? null;
    });

    return loadout;
  };

  return {
    encodeGearLoadout,
    decodeGearLoadout,
  };
}
