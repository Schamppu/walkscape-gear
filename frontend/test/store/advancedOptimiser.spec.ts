import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAdvancedOptimiserStore } from "@/store/advancedOptimiser";
import type { AdvancedOptimiserConfig } from "@/domain/advancedOptimiser/config";

const ACT_1 = { kind: "activity", id: "act_1" } as const;
const ACT_2 = { kind: "activity", id: "act_2" } as const;
const KEY = "advancedOptimiser.config.activity:act_1";
const LEGACY_KEY = "advancedOptimiser.config.act_1";

describe("advanced optimiser store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("saves changes and loads them in a fresh store", () => {
    const store = useAdvancedOptimiserStore();
    store.addTarget(ACT_1, { x: "chests", y: "action", weight: 0 });
    store.updateTarget(ACT_1, 1, { weight: 7 });

    setActivePinia(createPinia());
    const fresh = useAdvancedOptimiserStore();
    fresh.load(ACT_1);
    expect(fresh.configs["activity:act_1"].targets).toEqual([
      { x: "xp", y: "step", weight: 10 },
      { x: "chests", y: "action", weight: 7 },
    ]);
  });

  it("keeps configs per activity", () => {
    const store = useAdvancedOptimiserStore();
    store.removeTarget(ACT_1, 0);
    store.getOrCreate(ACT_2);
    expect(store.configs["activity:act_1"].targets).toEqual([]);
    expect(store.configs["activity:act_2"].targets).toHaveLength(1);
  });

  it("resetConfig forgets the config, in memory and saved", () => {
    const store = useAdvancedOptimiserStore();
    store.removeTarget(ACT_1, 0);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    store.resetConfig(ACT_1);
    expect(store.configs["activity:act_1"]).toBeUndefined();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("setConfig saves a copy", () => {
    const store = useAdvancedOptimiserStore();
    const config: AdvancedOptimiserConfig = {
      mode: { kind: "singleActivity", activityId: "act_1" },
      targets: [{ x: "chests", y: "action", weight: 4 }],
      combinationRule: "weightedSum",
      presetId: "builtin:balanced",
    };
    store.setConfig(ACT_1, config);
    store.updateTarget(ACT_1, 0, { weight: 9 });
    expect(config.targets[0].weight).toBe(4);
    expect(JSON.parse(localStorage.getItem(KEY)!).presetId).toBe(
      "builtin:balanced",
    );
  });

  it("setPresetId keeps the targets", () => {
    const store = useAdvancedOptimiserStore();
    store.setPresetId(ACT_1, "user:3");
    expect(store.configs["activity:act_1"]).toMatchObject({
      presetId: "user:3",
      targets: [{ x: "xp", y: "step", weight: 10 }],
    });
  });

  it("ignores unreadable saved data", () => {
    localStorage.setItem(KEY, "{not json");
    const store = useAdvancedOptimiserStore();
    expect(store.getOrCreate(ACT_1).targets).toEqual([
      { x: "xp", y: "step", weight: 10 },
    ]);
  });

  it("ignores a saved config for another activity", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        mode: { kind: "singleActivity", activityId: "other" },
        targets: [],
      }),
    );
    const store = useAdvancedOptimiserStore();
    store.load(ACT_1);
    expect(store.configs["activity:act_1"]).toBeUndefined();
  });

  it("keeps an activity and a recipe with the same id apart", () => {
    const store = useAdvancedOptimiserStore();
    store.removeTarget(ACT_1, 0);
    expect(
      store.getOrCreate({ kind: "recipe", id: "act_1" }).targets,
    ).toHaveLength(1);
    expect(store.configs["activity:act_1"].targets).toEqual([]);
  });

  it("moves a config saved under the legacy key to the new one", () => {
    const legacy = {
      mode: { kind: "singleActivity", activityId: "act_1" },
      targets: [{ x: "chests", y: "action", weight: 4 }],
      combinationRule: "weightedSum",
    };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    const store = useAdvancedOptimiserStore();
    store.load(ACT_1);
    expect(store.configs["activity:act_1"].targets).toEqual(legacy.targets);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(legacy);
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
    useAdvancedOptimiserStore().updateSettings({
      allowFineConsumables: false,
      minConsumableStock: 20,
    });
    setActivePinia(createPinia());
    expect(useAdvancedOptimiserStore().settings).toEqual({
      allowFineConsumables: false,
      minConsumableStock: 20,
    });
  });
});
