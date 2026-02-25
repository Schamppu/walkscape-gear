/**
 * Purpose:
 * Pure functions for encoding and decoding gear set export codes.
 *
 * Responsibilities:
 * - Build a serialisable slot representation from raw item data.
 * - Compress and base64-encode a list of exported slots into a share code.
 * - Decode, decompress, and validate an import code back into gear data.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs.
 * - Read reactive state.
 * - Make network calls.
 * - Mutate inputs.
 */

import pako from "pako";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal item fields needed to build an exported slot. */
export type ExportableSlotItem = {
  id: string;
  quality: string | null;
};

type ExportedItem = {
  id: string | undefined;
  quality: string | null;
  tag: null;
} | null;

export type ExportedSlot = {
  type: string;
  index: number | string;
  item: string;
  errors: never[];
};

export type ImportedGearData = {
  items: unknown[];
};

export type ImportResult =
  | { success: true; data: ImportedGearData; error: null }
  | { success: false; data: null; error: string };

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function uint8ToBase64(uint8: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Builds a single `ExportedSlot` from a slot name, its current item, and the
 * old-id mapping returned by the API.
 */
export function buildExportedSlot(
  slotName: string,
  item: ExportableSlotItem | null,
  itemIdMap: Record<string, string>,
): ExportedSlot {
  const match = slotName.match(/^([a-zA-Z]+)(\d+)?$/);
  const [type, index] = match
    ? [match[1], (match[2] as unknown as number) - 1 || 0]
    : ["", ""];

  const exportedItem: ExportedItem = item
    ? { id: itemIdMap[item.id], quality: item.quality, tag: null }
    : null;

  return {
    type,
    index,
    item: JSON.stringify(exportedItem),
    errors: [],
  };
}

/**
 * Serialises a list of exported slots to JSON, gzip-compresses it, and
 * returns a base64 string suitable for sharing.
 */
export function encodeGearSet(slots: ExportedSlot[]): string {
  const json = JSON.stringify({ items: slots });
  const compressed = pako.gzip(json);
  return uint8ToBase64(compressed);
}

/**
 * Decodes a base64 import code, decompresses it, parses the JSON, and
 * validates the expected structure. Returns a typed `ImportResult`.
 */
export function decodeGearSet(code: string): ImportResult {
  try {
    if (!code || typeof code !== "string") {
      throw new Error("Invalid input: code must be a non-empty string");
    }

    const compressed = base64ToUint8(code.trim());
    const decompressed = pako.ungzip(compressed, { to: "string" });
    const data = JSON.parse(decompressed);

    if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
      throw new Error(
        "Invalid gear set format: expected object with items array",
      );
    }

    return { success: true, data: data as ImportedGearData, error: null };
  } catch (error) {
    console.error(error);

    let errorMessage = "Failed to import gear set";
    if ((error as string).includes("Invalid character")) {
      errorMessage += ": Invalid base64 format";
    } else if ((error as string).includes("incorrect header check")) {
      errorMessage += ": Invalid compression format";
    } else if ((error as string).includes("Unexpected token")) {
      errorMessage += ": Invalid JSON format";
    } else {
      errorMessage += `: ${error}`;
    }

    return { success: false, data: null, error: errorMessage };
  }
}
