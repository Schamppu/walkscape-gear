import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";

const KEY = "advancedOptimiser.config.act_1";

describe("advanced optimiser store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("saves changes and loads them in a fresh store", () => {
    const store = useAdvancedOptimiserStore();
    store.addTarget("act_1", { x: "chests", y: "action", weight: 0 });
    store.updateTarget("act_1", 1, { weight: 7 });

    setActivePinia(createPinia());
    const fresh = useAdvancedOptimiserStore();
    fresh.load("act_1");
    expect(fresh.configs.act_1.targets).toEqual([
      { x: "xp", y: "step", weight: 10 },
      { x: "chests", y: "action", weight: 7 },
    ]);
  });

  it("keeps configs per activity", () => {
    const store = useAdvancedOptimiserStore();
    store.removeTarget("act_1", 0);
    store.getOrCreate("act_2");
    expect(store.configs.act_1.targets).toEqual([]);
    expect(store.configs.act_2.targets).toHaveLength(1);
  });

  it("resetConfig restores the default and forgets the saved one", () => {
    const store = useAdvancedOptimiserStore();
    store.removeTarget("act_1", 0);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    store.resetConfig("act_1");
    expect(store.configs.act_1.targets).toHaveLength(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores unreadable saved data", () => {
    localStorage.setItem(KEY, "{not json");
    const store = useAdvancedOptimiserStore();
    expect(store.getOrCreate("act_1").targets).toEqual([{ x: "xp", y: "step", weight: 10 }]);
  });

  it("ignores a saved config for another activity", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ mode: { kind: "singleActivity", activityId: "other" }, targets: [] }),
    );
    const store = useAdvancedOptimiserStore();
    store.load("act_1");
    expect(store.configs.act_1).toBeUndefined();
  });
});

describe("optimiser settings", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("starts from the defaults", () => {
    expect(useAdvancedOptimiserStore().settings).toEqual({
      allowFineConsumables: true,
      minConsumableStock: 0,
    });
  });

  it("saves changes and loads them in a fresh store", () => {
    useAdvancedOptimiserStore().updateSettings({ allowFineConsumables: false, minConsumableStock: 20 });
    setActivePinia(createPinia());
    expect(useAdvancedOptimiserStore().settings).toEqual({
      allowFineConsumables: false,
      minConsumableStock: 20,
    });
  });
});
