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

  const importCode = (code) => {
    try {
      // Validate input
      if (!code || typeof code !== "string") {
        throw new Error("Invalid input: code must be a non-empty string");
      }

      // Helper function to convert base64 to Uint8Array
      function base64ToUint8(base64) {
        const binary = atob(base64);
        const uint8 = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          uint8[i] = binary.charCodeAt(i);
        }
        return uint8;
      }

      // Decode base64 to compressed data
      const compressed = base64ToUint8(code.trim());

      // Decompress with gzip
      const decompressed = pako.ungzip(compressed, { to: "string" });

      // Parse the JSON
      const data = JSON.parse(decompressed);

      // Validate the expected structure
      if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
        throw new Error(
          "Invalid gear set format: expected object with items array"
        );
      }

      return {
        success: true,
        data: data,
        error: null,
      };
    } catch (error) {
      let errorMessage = "Failed to import gear set";
      console.log(error);

      if (error.includes("Invalid character")) {
        errorMessage += ": Invalid base64 format";
      } else if (error.includes("incorrect header check")) {
        errorMessage += ": Invalid compression format";
      } else if (error.includes("Unexpected token")) {
        errorMessage += ": Invalid JSON format";
      } else {
        errorMessage += `: ${error}`;
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  };

  return { exportCode, importCode };
}
