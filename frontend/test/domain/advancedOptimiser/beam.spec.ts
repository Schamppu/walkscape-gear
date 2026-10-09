import { describe, it, expect } from "vitest";
import { beamSearch, seedCandidates, setSignature } from "@/domain/advancedOptimiser/beam";
import { createSetScorer } from "@/domain/advancedOptimiser/scorer";
import type { HandledRequirement } from "@/domain/optimiser/requirements";
import {
  keywordEquippedReq,
  makeJob,
  makeLocationSummary,
  makeWorkerItem,
  realmReq,
  type FixtureStat,
} from "../../fixtures/advancedOptimiser";

// Fixture activity: 100 work, WE capped at ×2, 50 XP, target xp / step.

const item = (id: string, stats: FixtureStat[], keywords: string[] = []) =>
  makeWorkerItem(id, stats, { keywords });
const we = (value: number): FixtureStat => ({ type: "workEfficiency", value });
const da = (value: number): FixtureStat => ({ type: "doubleAction", value });

const ids = (set: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(set)
      .filter(([slot, v]) => v && slot !== "location")
      .map(([slot, v]) => [slot, (v as { id: string }).id]),
  );

describe("beamSearch", () => {
  // Head is filled first (2 options vs 3). Greedy takes the WE hat, but the
  // double-action hat is better once the chest caps work efficiency.
  const options = {
    head: [item("we_hat", [we(0.6)]), item("da_hat", [da(0.15)])],
    chest: [item("we_chest", [we(1)]), item("junk1", [we(0.05)]), item("junk2", [we(0.04)])],
  };
  const slots = ["head", "chest"];
  const score = createSetScorer(makeJob());

  it("with width 1 behaves greedily", () => {
    const [best] = beamSearch({}, slots, options, score, { width: 1, keywordsMap: {} });
    expect(ids(best.gearSet)).toEqual({ head: "we_hat", chest: "we_chest" });
  });

  it("with a wider beam finds the WE-cap combination greedy misses", () => {
    const [best] = beamSearch({}, slots, options, score, { width: 3, keywordsMap: {} });
    expect(ids(best.gearSet)).toEqual({ head: "da_hat", chest: "we_chest" });
    // 50 steps / 1.15 actions → xp/step 1.15, baseline 0.5.
    expect(best.result.score).toBeCloseTo(2.3, 10);
  });

  it("leaves a slot empty when every option hurts", () => {
    const [best] = beamSearch({}, ["head"], { head: [item("cursed", [we(-0.5)])] }, score, {
      width: 3,
      keywordsMap: {},
    });
    expect(ids(best.gearSet)).toEqual({});
  });

  it("keeps filled slots of the seed", () => {
    const locked = item("locked_hat", [we(0.1)]);
    const results = beamSearch({ head: locked }, slots, options, score, {
      width: 3,
      keywordsMap: {},
    });
    for (const { gearSet } of results) expect(gearSet.head).toBe(locked);
  });

  it("doesn't equip the same ring twice or banned combinations", () => {
    const gold = item("gold", [we(0.3)], ["gold_ring"]);
    const silver = item("silver", [we(0.2)], ["silver_ring"]);
    const plain = item("plain", [we(0.1)]);
    const results = beamSearch({}, ["ring1", "ring2"], { ring: [gold, silver, plain] }, score, {
      width: 5,
      keywordsMap: { gold_ring: { bannedKeywords: ["silver_ring"] } },
    });
    for (const { gearSet } of results) {
      const rings = [gearSet.ring1, gearSet.ring2].filter(Boolean).map((r) => (r as { id: string }).id);
      expect(new Set(rings).size).toBe(rings.length);
      expect(rings.includes("gold") && rings.includes("silver")).toBe(false);
    }
    expect(ids(results[0].gearSet)).toEqual({ ring1: "gold", ring2: "plain" });
  });

  it("returns no duplicate sets", () => {
    const results = beamSearch({}, slots, options, score, { width: 10, keywordsMap: {} });
    const signatures = results.map(({ gearSet }) => setSignature(gearSet));
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe("seedCandidates", () => {
  it("puts locked items in every candidate", () => {
    const locked = item("locked_hat", [we(0.1)]);
    const job = makeJob({
      options: { chest: [item("we_chest", [we(0.5)])] },
      searchSlots: ["chest"],
      lockedItems: { head: locked },
    });
    const results = seedCandidates(job, createSetScorer(job), 3);
    expect(results.length).toBeGreaterThan(0);
    for (const { gearSet } of results) expect(gearSet.head).toBe(locked);
  });

  it("tries every location", () => {
    const deepHat = makeWorkerItem("deep_hat", [], {
      conditional: [{ stats: [we(1)], requirements: [realmReq("syrenthia")] }],
    });
    const job = makeJob({
      options: { head: [deepHat] },
      searchSlots: ["head"],
      locations: [makeLocationSummary("town", "jarvonia"), makeLocationSummary("reef", "syrenthia")],
    });
    const [best] = seedCandidates(job, createSetScorer(job), 3);
    expect((best.gearSet.location as { id: string }).id).toBe("reef");
    expect(ids(best.gearSet)).toEqual({ head: "deep_hat" });
  });

  it("starts from requirement seeds so results are valid", () => {
    const rod = item("rod", [], ["fishing_rod"]);
    const job = makeJob({
      activityRequirements: [keywordEquippedReq("fishing_rod") as HandledRequirement],
      options: { head: [item("hat", [we(0.5)])] },
      searchSlots: ["head"],
      requirementSeeds: [{ tool1: rod }],
    });
    const [best] = seedCandidates(job, createSetScorer(job), 3);
    expect(best.result.valid).toBe(true);
    expect(ids(best.gearSet)).toEqual({ tool1: "rod", head: "hat" });
  });
});
