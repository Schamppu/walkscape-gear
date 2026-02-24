import { describe, it, expect } from "vitest";
import {
  encodeLoadout,
  decodeLoadout,
  encodeGearLoadout,
  decodeGearLoadout,
  buildReverseMapping,
} from "@/utils/urlEncoding";
import mappingFixture from "../fixtures/url_mapping.json";
import type { UrlMap } from "@/domain/types/item";

const mapping = mappingFixture as UrlMap;

/** The same slot order used by the url store / useUrlMap composable. */
const SLOT_ORDER: Record<string, string> = {
  activity: "activity",
  recipe: "recipe",
  cape: "cape",
  back: "back",
  neck: "neck",
  hands: "hands",
  head: "head",
  chest: "chest",
  legs: "legs",
  feet: "feet",
  primary: "primary",
  secondary: "secondary",
  ring1: "ring",
  ring2: "ring",
  tool1: "tool",
  tool2: "tool",
  tool3: "tool",
  tool4: "tool",
  tool5: "tool",
  tool6: "tool",
  consumable: "consumable",
  pet: "pet",
};

const reverseMapping = buildReverseMapping(mapping);

// ---------------------------------------------------------------------------
// encodeLoadout / decodeLoadout
// ---------------------------------------------------------------------------

describe("encodeLoadout / decodeLoadout", () => {
  it("round-trips an array of zeros", () => {
    const indices = [0, 0, 0, 0];
    const encoded = encodeLoadout(indices, 9);
    expect(decodeLoadout(encoded, 9, indices.length)).toEqual(indices);
  });

  it("round-trips an array with non-zero values", () => {
    const indices = [1, 3, 0, 2, 5];
    const encoded = encodeLoadout(indices, 9);
    expect(decodeLoadout(encoded, 9, indices.length)).toEqual(indices);
  });

  it("round-trips the maximum value for 9-bit encoding (511)", () => {
    const indices = [511, 0, 511];
    const encoded = encodeLoadout(indices, 9);
    expect(decodeLoadout(encoded, 9, indices.length)).toEqual(indices);
  });

  it("produces a non-empty base64 string", () => {
    const encoded = encodeLoadout([1, 2, 3], 9);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("produces the same output for the same input (deterministic)", () => {
    const indices = [1, 2, 3, 0, 4];
    expect(encodeLoadout(indices, 9)).toBe(encodeLoadout(indices, 9));
  });
});

// ---------------------------------------------------------------------------
// buildReverseMapping
// ---------------------------------------------------------------------------

describe("buildReverseMapping", () => {
  it("maps each item ID to its index in the slot array", () => {
    const reverse = buildReverseMapping(mapping);
    expect(reverse["cape"]["fur_cape"]).toBe(1);
    expect(reverse["cape"]["adventurer_cape"]).toBe(2);
    expect(reverse["ring"]["copper_ring"]).toBe(1);
    expect(reverse["ring"]["silver_ring"]).toBe(2);
  });

  it("index 0 is reserved for null / empty slot", () => {
    const reverse = buildReverseMapping(mapping);
    // null at index 0 should map to "null" key - verify no real item is at 0
    expect(reverse["cape"]["fur_cape"]).toBeGreaterThan(0);
  });

  it("produces an entry for every slot in the mapping", () => {
    const reverse = buildReverseMapping(mapping);
    for (const slot of Object.keys(mapping)) {
      expect(reverse).toHaveProperty(slot);
    }
  });
});

// ---------------------------------------------------------------------------
// encodeGearLoadout / decodeGearLoadout
// ---------------------------------------------------------------------------

describe("encodeGearLoadout / decodeGearLoadout", () => {
  it("round-trips an empty loadout (all nulls)", () => {
    const loadout: Record<string, null> = Object.fromEntries(
      Object.keys(SLOT_ORDER).map((k) => [k, null]),
    );

    const encoded = encodeGearLoadout(SLOT_ORDER, loadout, reverseMapping);
    const decoded = decodeGearLoadout(encoded, SLOT_ORDER, mapping);

    Object.keys(SLOT_ORDER).forEach((slot) => {
      expect(decoded[slot]).toBeNull();
    });
  });

  it("round-trips a fully populated loadout", () => {
    const loadout: Record<string, { id: string } | null> = {
      activity: { id: "foraging_birchwood" },
      recipe: { id: "bread_basic" },
      cape: { id: "fur_cape" },
      back: { id: "leather_pack" },
      neck: { id: "copper_amulet" },
      hands: { id: "leather_gloves" },
      head: { id: "leather_cap" },
      chest: { id: "leather_shirt" },
      legs: { id: "leather_trousers" },
      feet: { id: "leather_boots" },
      primary: { id: "copper_sword" },
      secondary: { id: "wooden_shield" },
      ring1: { id: "copper_ring" },
      ring2: { id: "silver_ring" },
      tool1: { id: "basic_fishing_rod" },
      tool2: null,
      tool3: null,
      tool4: null,
      tool5: null,
      tool6: null,
      consumable: { id: "bread" },
      pet: { id: "cat" },
    };

    const encoded = encodeGearLoadout(SLOT_ORDER, loadout, reverseMapping);
    const decoded = decodeGearLoadout(encoded, SLOT_ORDER, mapping);

    expect(decoded["activity"]).toBe("foraging_birchwood");
    expect(decoded["cape"]).toBe("fur_cape");
    expect(decoded["ring1"]).toBe("copper_ring");
    expect(decoded["ring2"]).toBe("silver_ring");
    expect(decoded["tool1"]).toBe("basic_fishing_rod");
    expect(decoded["tool2"]).toBeNull();
    expect(decoded["consumable"]).toBe("bread");
    expect(decoded["pet"]).toBe("cat");
  });

  it("returns null for slots with unknown item IDs", () => {
    const loadout = { cape: { id: "nonexistent_item_xyz" } };
    const encoded = encodeGearLoadout(SLOT_ORDER, loadout, reverseMapping);
    const decoded = decodeGearLoadout(encoded, SLOT_ORDER, mapping);
    // unknown IDs encode as index 0, which decodes back to null
    expect(decoded["cape"]).toBeNull();
  });

  it("returns null for absent slot entries", () => {
    const loadout = { head: { id: "leather_cap" } };
    const encoded = encodeGearLoadout(SLOT_ORDER, loadout, reverseMapping);
    const decoded = decodeGearLoadout(encoded, SLOT_ORDER, mapping);
    expect(decoded["cape"]).toBeNull();
    expect(decoded["head"]).toBe("leather_cap");
  });

  it("two ring slots with same item ID decode independently", () => {
    const loadout = {
      ring1: { id: "copper_ring" },
      ring2: { id: "copper_ring" },
    };
    const encoded = encodeGearLoadout(SLOT_ORDER, loadout, reverseMapping);
    const decoded = decodeGearLoadout(encoded, SLOT_ORDER, mapping);
    expect(decoded["ring1"]).toBe("copper_ring");
    expect(decoded["ring2"]).toBe("copper_ring");
  });
});
