import { describe, it, expect } from "vitest";
import {
  DEFAULT_OPTIMISER_SETTINGS,
  parseOptimiserSettings,
  suggestableConsumableQualities,
} from "@/domain/advancedOptimiser/consumables";
import { pruneDominated } from "@/domain/advancedOptimiser/pruning";
import { makeWorkerItem } from "../../fixtures/advancedOptimiser";

/** An owned consumable with these common and fine counts. */
const owned = (common: number, fine: number) => ({ quantity: common + fine, quantityFine: fine });

describe("suggestableConsumableQualities", () => {
  const settings = (overrides = {}) => ({ ...DEFAULT_OPTIMISER_SETTINGS, ...overrides });

  it("offers every quality with stock, fine first", () => {
    expect(suggestableConsumableQualities(owned(10, 10), settings())).toEqual([
      "fine",
      "common",
    ]);
    expect(suggestableConsumableQualities(owned(3, 0), settings())).toEqual(["common"]);
  });

  it("leaves out fine when fine consumables are off", () => {
    const noFine = settings({ allowFineConsumables: false });
    expect(suggestableConsumableQualities(owned(10, 10), noFine)).toEqual(["common"]);
    expect(suggestableConsumableQualities(owned(0, 10), noFine)).toEqual([]);
  });

  it("checks each quality's stock on its own", () => {
    const min = settings({ minConsumableStock: 5 });
    expect(suggestableConsumableQualities(owned(4, 4), min)).toEqual([]);
    expect(suggestableConsumableQualities(owned(20, 2), min)).toEqual(["common"]);
    expect(suggestableConsumableQualities(owned(2, 20), min)).toEqual(["fine"]);
    expect(suggestableConsumableQualities(owned(5, 0), min)).toEqual(["common"]);
  });

  it("counts everything as common in data saved without a fine count", () => {
    expect(suggestableConsumableQualities({ quantity: 8 }, settings({ minConsumableStock: 5 }))).toEqual([
      "common",
    ]);
  });

  it("returns null when no count is recorded", () => {
    expect(suggestableConsumableQualities(owned(0, 0), settings())).toBeNull();
  });
});

describe("parseOptimiserSettings", () => {
  it("falls back to defaults", () => {
    expect(parseOptimiserSettings(null)).toEqual(DEFAULT_OPTIMISER_SETTINGS);
    expect(parseOptimiserSettings({ allowFineConsumables: "no", minConsumableStock: "x" })).toEqual(
      DEFAULT_OPTIMISER_SETTINGS,
    );
  });

  it("keeps valid values and floors the stock", () => {
    expect(parseOptimiserSettings({ allowFineConsumables: false, minConsumableStock: 12.7 })).toEqual({
      allowFineConsumables: false,
      minConsumableStock: 12,
    });
    expect(parseOptimiserSettings({ minConsumableStock: -3 }).minConsumableStock).toBe(0);
  });
});

describe("fine and common versions of a consumable", () => {
  it("fine beats common in pruning, so allowing fine still suggests fine", () => {
    const common = { ...makeWorkerItem("pie", [{ type: "workEfficiency", value: 0.1 }]), quality: "common" };
    const fine = { ...makeWorkerItem("pie", [{ type: "workEfficiency", value: 0.2 }]), quality: "fine" };
    const kept = pruneDominated({ consumable: [fine, common] as never }, {});
    expect(kept.consumable.map((i) => i.quality)).toEqual(["fine"]);
  });
});
