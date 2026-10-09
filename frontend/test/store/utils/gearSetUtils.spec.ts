import { describe, it, expect } from "vitest";
import { buildGearSlotMapping } from "@/store/utils/gearSetUtils";

describe("buildGearSlotMapping", () => {
  it("reads gear sets saved with the old consumable qualities", () => {
    const mapping = buildGearSlotMapping(
      [
        { slotType: "consumable", slotIndex: 0, itemId: "pie", quality: "consumableFine" },
        { slotType: "ring", slotIndex: 1, itemId: "gold_ring", quality: "rare" },
      ] as never,
      ["head"],
    );
    expect(mapping).toEqual({
      consumable: { id: "pie", quality: "fine" },
      ring2: { id: "gold_ring", quality: "rare" },
      head: null,
    });
  });
});
