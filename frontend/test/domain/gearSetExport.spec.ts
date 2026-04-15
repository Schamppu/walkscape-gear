import { describe, it, expect } from "vitest";
import {
  buildExportedSlot,
  encodeGearSet,
  decodeGearSet,
  type ExportedSlot,
  type ExportableSlotItem,
} from "@/domain/gearSetExport";

// ---------------------------------------------------------------------------
// buildExportedSlot
// ---------------------------------------------------------------------------

describe("buildExportedSlot", () => {
  const idMap: Record<string, string> = { item_a: "old_a", item_b: "old_b" };

  it("parses a numbered slot: type is the alpha part, index is (number - 1)", () => {
    const slot = buildExportedSlot("ring1", { id: "item_a", quality: "common" }, idMap);
    expect(slot.type).toBe("ring");
    expect(slot.index).toBe(0);
  });

  it("parses ring2 as index 1", () => {
    const slot = buildExportedSlot("ring2", { id: "item_a", quality: "common" }, idMap);
    expect(slot.type).toBe("ring");
    expect(slot.index).toBe(1);
  });

  it("parses tool3 as type=tool, index=2", () => {
    const slot = buildExportedSlot("tool3", { id: "item_a", quality: "common" }, idMap);
    expect(slot.type).toBe("tool");
    expect(slot.index).toBe(2);
  });

  it("parses a non-numbered slot: type is full name, index is 0", () => {
    const slot = buildExportedSlot("head", { id: "item_a", quality: "common" }, idMap);
    expect(slot.type).toBe("head");
    expect(slot.index).toBe(0);
  });

  it("maps the item id through the itemIdMap", () => {
    const slot = buildExportedSlot("head", { id: "item_a", quality: "common" }, idMap);
    const parsed = JSON.parse(slot.item);
    expect(parsed.id).toBe("old_a");
  });

  it("preserves the item quality in the serialised item", () => {
    const slot = buildExportedSlot(
      "head",
      { id: "item_a", quality: "rare" },
      idMap,
    );
    const parsed = JSON.parse(slot.item);
    expect(parsed.quality).toBe("rare");
  });

  it("serialises a null item as JSON null", () => {
    const slot = buildExportedSlot("chest", null, idMap);
    expect(JSON.parse(slot.item)).toBeNull();
  });

  it("always returns an empty errors array", () => {
    const slot = buildExportedSlot("head", null, idMap);
    expect(slot.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// encodeGearSet / decodeGearSet round-trip
// ---------------------------------------------------------------------------

describe("encodeGearSet + decodeGearSet round-trip", () => {
  function makeSlots(): ExportedSlot[] {
    const item: ExportableSlotItem = { id: "axe_01", quality: "rare" };
    return [
      buildExportedSlot("head", null, {}),
      buildExportedSlot("primary", item, { axe_01: "legacy_axe" }),
      buildExportedSlot("ring1", null, {}),
    ];
  }

  it("decodes an encoded gear set successfully", () => {
    const code = encodeGearSet(makeSlots());
    const result = decodeGearSet(code);
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("round-tripped items array has the same length", () => {
    const slots = makeSlots();
    const code = encodeGearSet(slots);
    const result = decodeGearSet(code);
    expect(result.data!.items).toHaveLength(slots.length);
  });

  it("round-tripped slot types are preserved", () => {
    const slots = makeSlots();
    const code = encodeGearSet(slots);
    const result = decodeGearSet(code);
    const items = result.data!.items as ExportedSlot[];
    expect(items[0].type).toBe("head");
    expect(items[1].type).toBe("primary");
    expect(items[2].type).toBe("ring");
  });

  it("produces a non-empty string code", () => {
    const code = encodeGearSet(makeSlots());
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// decodeGearSet error cases
// ---------------------------------------------------------------------------

describe("decodeGearSet error handling", () => {
  it("returns failure for an empty string", () => {
    const result = decodeGearSet("");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("returns failure for clearly invalid input", () => {
    const result = decodeGearSet("$$$$not-valid-base64!!!!$$$$");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("returns failure for valid base64 that is not gzip data", () => {
    const notGzip = Buffer.from("this is not gzip data").toString("base64");
    const result = decodeGearSet(notGzip);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("returns failure for gear set JSON missing the items array", () => {
    // Manually encode JSON without items
    const pako = require("pako");
    const bad = Buffer.from(
      pako.gzip(JSON.stringify({ notItems: [] })),
    ).toString("base64");
    const result = decodeGearSet(bad);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("error message is a non-empty string", () => {
    const result = decodeGearSet("bad");
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});
