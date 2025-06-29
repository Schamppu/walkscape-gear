import pako from "pako";
import { useGearStore } from "@/store/gear";

export function useGearSetExport() {
  const gearStore = useGearStore();

  const exportItem = (slotName) => {
    const match = slotName.match(/^([a-zA-Z]+)(\d+)?$/);
    const [type, index] = match ? [match[1], match[2] - 1 || 0] : ["", ""];
    const slotItem = gearStore.get(slotName);
    const item = slotItem
      ? {
          id: slotItem?.id,
          quality: slotItem.quality,
          tag: null,
        }
      : null;

    return {
      type,
      index,
      item: JSON.stringify(item),
      errors: [],
    };
  };

  const exportCode = () => {
    const excluded = ["consumable", "potion", "service"];
    const slotKeys = Object.keys(gearStore.gearSlots).filter(
      (key) => !excluded.includes(key)
    );

    const items = slotKeys.map(exportItem);
    const json = JSON.stringify({ items });
    const compressed = pako.gzip(json);

    function uint8ToBase64(uint8) {
      // Convert Uint8Array to string
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return btoa(binary);
    }

    const base64 = uint8ToBase64(compressed);
    return base64;
  };

  return { exportCode };
}
