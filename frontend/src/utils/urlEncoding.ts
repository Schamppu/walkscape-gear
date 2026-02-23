/**
 * Purpose:
 * Pure utility functions for encoding and decoding gear loadouts into
 * compact base64 URL strings.
 *
 * Responsibilities:
 * - Convert arrays of numeric indices to/from a base64-encoded bit-string.
 * - Map a gear loadout to index arrays (and back) using a slot/item mapping.
 *
 * Does NOT:
 * - Import Vue, Pinia, or any reactive APIs.
 * - Access stores or composables.
 * - Contain any side effects.
 */

import type { UrlMap } from "@/domain/types/item";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A slot-order map: slot key (e.g. "ring1") → slot-name used in the UrlMap
 * (e.g. "ring").  Determines encode/decode position order.
 */
export type SlotOrder = Record<string, string>;

/**
 * Reverse of UrlMap: slot-name → item ID → encoded index.
 * Pre-computed once from the UrlMap for O(1) lookups.
 */
export type ReverseMapping = Record<string, Record<string, number>>;

/**
 * Minimal shape required from each loadout entry during encoding.
 * Items only need to expose their `id`; gear stores carry extra fields.
 */
export type LoadoutEntry = { id?: string | null } | null;

/** Decoded output: slot key → item ID or null (absent / index 0). */
export type DecodedLoadout = Record<string, string | null>;

// ---------------------------------------------------------------------------
// Low-level bit-packing
// ---------------------------------------------------------------------------

/**
 * Encode an array of unsigned integers into a base64 string.
 * Each integer is packed as `bitsPerItem` bits in a big-endian bit-string.
 *
 * @param indices     Array of non-negative integers to encode.
 * @param bitsPerItem How many bits to use for each integer (e.g. 9 → max 511).
 */
export function encodeLoadout(indices: number[], bitsPerItem: number): string {
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

/**
 * Decode a base64 string back into an array of unsigned integers.
 * Inverse of `encodeLoadout`.
 *
 * @param encoded     The base64 string produced by `encodeLoadout`.
 * @param bitsPerItem Bits used per integer during encoding.
 * @param numItems    Number of integers to extract.
 */
export function decodeLoadout(
  encoded: string,
  bitsPerItem: number,
  numItems: number,
): number[] {
  const binaryStr = atob(encoded)
    .split("")
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");

  const indices: number[] = [];
  for (let i = 0; i < numItems; i++) {
    const bits = binaryStr.slice(i * bitsPerItem, (i + 1) * bitsPerItem);
    indices.push(parseInt(bits, 2));
  }

  return indices;
}

// ---------------------------------------------------------------------------
// High-level gear loadout encoding/decoding
// ---------------------------------------------------------------------------

const BITS_PER_ITEM = 9;

/**
 * Encode a gear/activity loadout into a compact base64 string.
 *
 * @param slotOrder      Maps slot keys to slot-names (defines position order).
 * @param loadout        Current loadout: slot key → item-like object (or null).
 * @param reverseMapping Pre-computed reverse index map (slot-name → id → index).
 */
export function encodeGearLoadout(
  slotOrder: SlotOrder,
  loadout: Record<string, LoadoutEntry>,
  reverseMapping: ReverseMapping,
): string {
  const indices = Object.entries(slotOrder).map(([slot, slotName]) => {
    const itemId = loadout[slot]?.id ?? null;
    if (!itemId) return 0;
    return reverseMapping[slotName]?.[itemId] ?? 0;
  });

  return encodeLoadout(indices, BITS_PER_ITEM);
}

/**
 * Decode a base64 URL string back into a slot → item-ID map.
 *
 * @param encoded    The base64 string produced by `encodeGearLoadout`.
 * @param slotOrder  The same slot-order map used during encoding.
 * @param mapping    The forward UrlMap (slot-name → ordered array of item IDs).
 */
export function decodeGearLoadout(
  encoded: string,
  slotOrder: SlotOrder,
  mapping: UrlMap,
): DecodedLoadout {
  const numItems = Object.keys(slotOrder).length;
  const numbers = decodeLoadout(encoded, BITS_PER_ITEM, numItems);

  const result: DecodedLoadout = {};

  Object.entries(slotOrder).forEach(([slot, slotName], i) => {
    const chunk = numbers[i];
    if (chunk === 0) {
      result[slot] = null;
      return;
    }
    result[slot] = mapping[slotName]?.[chunk] ?? null;
  });

  return result;
}

/**
 * Build a `ReverseMapping` from a `UrlMap`.
 * The result maps: slot-name → item ID → index in that slot's array.
 */
export function buildReverseMapping(mapping: UrlMap): ReverseMapping {
  const reverse: ReverseMapping = {};
  for (const slot in mapping) {
    reverse[slot] = Object.fromEntries(
      mapping[slot].map((id, index) => [id, index]),
    );
  }
  return reverse;
}
