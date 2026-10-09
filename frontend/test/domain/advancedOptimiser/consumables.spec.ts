import { describe, it, expect } from "vitest";
import {
  DEFAULT_OPTIMISER_SETTINGS,
  parseOptimiserSettings,
  suggestableConsumableQualities,
} from "@/domain/advancedOptimiser/consumables";
import { pruneDominated } from "@/domain/advancedOptimiser/pruning";
import { makeWorkerItem } from "../../fixtures/advancedOptimiser";

const owned = (common: boolean, fine: boolean, commonCount = 10, fineCount = 10) => ({
  consumableCommon: common,
  consumableFine: fine,
  quantity: commonCount + fineCount,
  quantityFine: fineCount,
});

describe("suggestableConsumableQualities", () => {
  const settings = (overrides = {}) => ({ ...DEFAULT_OPTIMISER_SETTINGS, ...overrides });

  it("offers every owned quality, fine first", () => {
    expect(suggestableConsumableQualities(owned(true, true), settings())).toEqual([
      "consumableFine",
      "consumableCommon",
    ]);
  });

  it("leaves out fine when fine consumables are off", () => {
    expect(suggestableConsumableQualities(owned(true, true), settings({ allowFineConsumables: false }))).toEqual([
      "consumableCommon",
    ]);
    expect(suggestableConsumableQualities(owned(false, true), settings({ allowFineConsumables: false }))).toEqual([]);
  });

  it("checks each quality's stock on its own", () => {
    const min = settings({ minConsumableStock: 5 });
    expect(suggestableConsumableQualities(owned(true, true, 4, 4), min)).toEqual([]);
    expect(suggestableConsumableQualities(owned(true, true, 20, 2), min)).toEqual(["consumableCommon"]);
    expect(suggestableConsumableQualities(owned(true, true, 2, 20), min)).toEqual(["consumableFine"]);
    expect(suggestableConsumableQualities(owned(true, false, 5, 0), min)).toEqual(["consumableCommon"]);
  });

  it("counts everything as common in data saved without a fine count", () => {
    const old = { consumableCommon: true, consumableFine: true, quantity: 8 };
    expect(suggestableConsumableQualities(old, settings({ minConsumableStock: 5 }))).toEqual([
      "consumableCommon",
    ]);
  });

  it("returns null when no quality is recorded", () => {
    expect(suggestableConsumableQualities(owned(false, false), settings())).toBeNull();
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
    const common = { ...makeWorkerItem("pie", [{ type: "workEfficiency", value: 0.1 }]), quality: "consumableCommon" };
    const fine = { ...makeWorkerItem("pie", [{ type: "workEfficiency", value: 0.2 }]), quality: "consumableFine" };
    const kept = pruneDominated({ consumable: [fine, common] as never }, {});
    expect(kept.consumable.map((i) => i.quality)).toEqual(["consumableFine"]);
  });
});
