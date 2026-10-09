import { describe, it, expect } from "vitest";
import { consumableQualityOptions, normalizeConsumableQuality } from "@/domain/constants/quality";

describe("consumableQualityOptions", () => {
  it("uses the game's plain qualities", () => {
    expect(consumableQualityOptions.map((q) => q.value)).toEqual(["common", "fine"]);
  });
});

describe("normalizeConsumableQuality", () => {
  it("maps the old consumable qualities", () => {
    expect(normalizeConsumableQuality("consumableCommon")).toBe("common");
    expect(normalizeConsumableQuality("consumableFine")).toBe("fine");
  });

  it.each(["common", "fine", "rare", "3", null, undefined])("leaves %o unchanged", (quality) => {
    expect(normalizeConsumableQuality(quality)).toBe(quality);
  });
});
