import { describe, it, expect } from "vitest";
import { slotOptions } from "@/domain/advancedOptimiser/beam";
import { seedCandidates } from "@/domain/advancedOptimiser/beam";
import { compareSetScores, createSetScorer, type SetScore } from "@/domain/advancedOptimiser/scorer";
import {
  DEFAULT_SEARCH_SETTINGS,
  runSearch,
  type SearchSettings,
} from "@/domain/advancedOptimiser/search";
import type { WorkerGearSet, WorkerItem } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import {
  makeJob,
  makeLocationSummary,
  makeTarget,
  makeWorkerItem,
  realmReq,
  seededRandom,
  setBonusReq,
  tickingClock,
  type FixtureStat,
} from "../../fixtures/advancedOptimiser";

// Small universes whose optimum is found by brute force, checking that the
// search finds it. Each one contains an interaction that per-item scoring
// would get wrong.

const we = (value: number): FixtureStat => ({ type: "workEfficiency", value });
const da = (value: number): FixtureStat => ({ type: "doubleAction", value });
const nmc = (value: number): FixtureStat => ({ type: "noMaterialsConsumed", value });
const dr = (value: number): FixtureStat => ({ type: "doubleRewards", value });
const item = (id: string, stats: FixtureStat[], keywords: string[] = []) =>
  makeWorkerItem(id, stats, { keywords });

/** Every possible set (each slot empty or any allowed option, every location). */
const bruteForce = (job: AdvancedOptimiserJob): SetScore => {
  const score = createSetScorer(job);
  let best: SetScore | null = null;
  const locations = job.locations.length ? job.locations : [job.defaultLocation];

  const visit = (set: WorkerGearSet, index: number) => {
    if (index === job.searchSlots.length) {
      const result = score(set);
      if (!best || compareSetScores(result, best) < 0) best = result;
      return;
    }
    const slot = job.searchSlots[index];
    visit(set, index + 1);
    for (const option of slotOptions(set, slot, job.options, job.keywordsMap)) {
      visit({ ...set, [slot]: option }, index + 1);
    }
  };

  for (const location of locations) visit({ ...job.lockedItems, location }, 0);
  return best!;
};

const search = (job: AdvancedOptimiserJob, settings: Partial<SearchSettings> = {}) =>
  runSearch(
    job,
    { ...DEFAULT_SEARCH_SETTINGS, timeBudgetMs: 1e9, patience: 30, ...settings },
    {
      now: tickingClock(),
      random: seededRandom(42),
      shouldStop: () => false,
      yieldToEventLoop: async () => {},
    },
  );

// ---------------------------------------------------------------------------
// Universes
// ---------------------------------------------------------------------------

/** Work-efficiency cap: the trade-off items only pay off once WE is capped. */
const weCapJob = (): AdvancedOptimiserJob =>
  makeJob({
    searchSlots: ["head", "chest", "legs", "ring1", "ring2"],
    options: {
      head: [item("we_hat", [we(0.6)]), item("da_hat", [da(0.15)])],
      chest: [item("we_chest", [we(0.5)]), item("tradeoff_chest", [we(-0.2), da(0.25)])],
      legs: [item("we_legs", [we(0.4)]), item("tradeoff_legs", [we(-0.15), da(0.2)])],
      ring: [item("we_ring", [we(0.2)]), item("da_ring", [da(0.05)]), item("we_ring2", [we(0.15)])],
    },
  });

/** No materials consumed: increasing returns beat double rewards when stacked. */
const nmcJob = (): AdvancedOptimiserJob =>
  makeJob({
    targets: [makeTarget("rewardRolls", "material", 1)],
    source: { maxWorkEfficiency: 2, workRequired: 100, xpRewards: { crafting: 50 } },
    activitySelected: false,
    extraction: { activitySkills: ["crafting"], quality: null, drops: { chestsPerRoll: 0, tokenBasePerRoll: 0, tokenFineBonusPerRoll: 0 } },
    searchSlots: ["head", "chest", "legs", "feet"],
    options: {
      head: [item("nmc_hat", [nmc(0.2)]), item("dr_hat", [dr(0.3)])],
      chest: [item("nmc_chest", [nmc(0.2)]), item("dr_chest", [dr(0.3)])],
      legs: [item("nmc_legs", [nmc(0.2)]), item("dr_legs", [dr(0.3)])],
      feet: [item("nmc_feet", [nmc(0.2)]), item("dr_feet", [dr(0.3)])],
    },
  });

/** A 3-piece set whose pieces are each weaker than the alternative. */
const setBonusJob = (): AdvancedOptimiserJob => {
  const piece = (id: string) =>
    makeWorkerItem(id, [we(0.05)], {
      keywords: ["treasure"],
      conditional: [{ stats: [da(0.3)], requirements: [setBonusReq("treasure", 3)] }],
    });
  return makeJob({
    searchSlots: ["head", "chest", "legs"],
    options: {
      head: [item("we_hat", [we(0.3)]), piece("t_hat")],
      chest: [item("we_chest", [we(0.3)]), piece("t_chest")],
      legs: [item("we_legs", [we(0.3)]), piece("t_legs")],
    },
  });
};

/** A realm-only item: the best set needs the right location. */
const locationJob = (): AdvancedOptimiserJob =>
  makeJob({
    searchSlots: ["head", "chest"],
    locations: [makeLocationSummary("town", "jarvonia"), makeLocationSummary("reef", "syrenthia")],
    options: {
      head: [
        item("we_hat", [we(0.3)]),
        makeWorkerItem("deep_hat", [], { conditional: [{ stats: [we(0.8)], requirements: [realmReq("syrenthia")] }] }),
      ],
      chest: [item("we_chest", [we(0.2)])],
    },
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("advanced optimiser finds the brute-force optimum", () => {
  it.each([
    ["work-efficiency cap trade-offs", weCapJob],
    ["no-materials-consumed increasing returns", nmcJob],
    ["3-piece set bonus", setBonusJob],
    ["realm-only item and location", locationJob],
  ])("%s", async (_, makeUniverse) => {
    const job = makeUniverse();
    const expected = bruteForce(job);
    const result = await search(job);
    expect(result.valid).toBe(expected.valid);
    expect(result.bestScore).toBeCloseTo(expected.score, 10);
  });

  it("finds the set bonus even when the beam alone misses it", async () => {
    const job = setBonusJob();
    const expected = bruteForce(job);
    const [greedy] = seedCandidates(job, createSetScorer(job), 1);
    expect(greedy.result.score).toBeLessThan(expected.score);

    const result = await search(job, { beamWidth: 1 });
    expect(result.bestScore).toBeCloseTo(expected.score, 10);
    const equipped = Object.values(result.gearSet) as WorkerItem[];
    expect(equipped.filter((i) => i?.keywords?.includes("treasure"))).toHaveLength(3);
  });

  it("finds the work-efficiency cap combination from a greedy start", async () => {
    const job = weCapJob();
    const expected = bruteForce(job);
    const result = await search(job, { beamWidth: 1 });
    expect(result.bestScore).toBeCloseTo(expected.score, 10);
  });
});

// Benchmark: run with `BENCH=1 npx vitest run algorithm`. Checks a large
// synthetic universe stays within twice the time budget.
describe.skipIf(!process.env.BENCH)("benchmark", () => {
  it("20 slots × 30 items finishes within 2× the budget", async () => {
    const random = seededRandom(7);
    const types = ["workEfficiency", "doubleAction", "doubleRewards", "bonusExperience"];
    const slots = Array.from({ length: 20 }, (_, i) => `slot${String.fromCharCode(97 + i)}`);
    const options = Object.fromEntries(
      slots.map((slot) => [
        slot,
        Array.from({ length: 30 }, (_, i) =>
          item(`${slot}_${i}`, [
            { type: types[i % types.length], value: random() * 0.2 },
            { type: types[(i + 1) % types.length], value: (random() - 0.5) * 0.1 },
          ]),
        ),
      ]),
    );
    const job = makeJob({ searchSlots: slots, options });
    const budget = 10_000;
    const start = performance.now();
    await runSearch(job, { ...DEFAULT_SEARCH_SETTINGS, timeBudgetMs: budget }, {
      now: () => performance.now(),
      random,
      shouldStop: () => false,
    });
    expect(performance.now() - start).toBeLessThan(2 * budget);
  }, 30_000);
});
