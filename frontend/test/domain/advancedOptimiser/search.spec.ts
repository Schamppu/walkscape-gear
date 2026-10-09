import { describe, it, expect } from "vitest";
import {
  climb,
  DEFAULT_SEARCH_SETTINGS,
  runSearch,
  type SearchSettings,
} from "@/domain/advancedOptimiser/search";
import { createSetScorer } from "@/domain/advancedOptimiser/scorer";
import { createSession } from "@/workers/advancedOptimiserSession";
import type { AdvancedOptimiserOutbound } from "@/workers/advancedOptimiserWorkerTypes";
import {
  makeJob,
  makeWorkerItem,
  seededRandom,
  tickingClock,
  type FixtureStat,
} from "../../fixtures/advancedOptimiser";

const we = (value: number): FixtureStat => ({ type: "workEfficiency", value });
const item = (id: string, stats: FixtureStat[]) => makeWorkerItem(id, stats);

const job = makeJob({
  searchSlots: ["head", "chest"],
  options: {
    head: [item("small_hat", [we(0.1)]), item("big_hat", [we(0.4)])],
    chest: [item("small_chest", [we(0.1)]), item("big_chest", [we(0.3)])],
  },
});

const settings = (overrides: Partial<SearchSettings> = {}): SearchSettings => ({
  ...DEFAULT_SEARCH_SETTINGS,
  timeBudgetMs: 1e9,
  patience: 5,
  ...overrides,
});

const hooks = (overrides = {}) => ({
  now: tickingClock(),
  random: seededRandom(1),
  shouldStop: () => false,
  yieldToEventLoop: async () => {},
  ...overrides,
});

describe("climb", () => {
  it("reaches the optimum of a small space from an empty set", () => {
    const score = createSetScorer(job);
    const result = climb(
      { gearSet: {}, result: score({}) },
      {
        moves: { slots: job.searchSlots, options: job.options, locations: [], keywordsMap: {}, setKeywords: [] },
        score,
        pairSamples: 10,
        random: seededRandom(1),
      },
    );
    expect((result.gearSet.head as { id: string }).id).toBe("big_hat");
    expect((result.gearSet.chest as { id: string }).id).toBe("big_chest");
  });
});

describe("runSearch", () => {
  it("refuses best-for-skill mode, which isn't implemented", async () => {
    const bestForSkill = { ...job, mode: { kind: "bestForSkill" as const, skillId: "fishing" as const } };
    await expect(runSearch(bestForSkill, settings(), hooks())).rejects.toThrow("not implemented");
  });

  it("stops once the time budget is used up", async () => {
    const result = await runSearch(job, settings({ timeBudgetMs: 50, patience: 1e9 }), hooks());
    expect(result.cancelled).toBe(false);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(50);
    expect(result.elapsedMs).toBeLessThan(500);
  });

  it("stops early after `patience` restarts without improvement", async () => {
    const result = await runSearch(job, settings({ patience: 3 }), hooks());
    expect(result.elapsedMs).toBeLessThan(1e6);
    expect((result.gearSet.head as { id: string }).id).toBe("big_hat");
  });

  it("returns the best set so far when stopped", async () => {
    let checks = 0;
    const result = await runSearch(job, settings({ patience: 1e9 }), hooks({ shouldStop: () => ++checks > 3 }));
    expect(result.cancelled).toBe(true);
    expect(result.bestScore).toBeGreaterThan(0);
  });

  it("reports progress at the configured cadence", async () => {
    const reports: number[] = [];
    await runSearch(
      job,
      settings({ timeBudgetMs: 1000, patience: 1e9, progressEveryMs: 200 }),
      hooks({ now: tickingClock(10), onProgress: (p: { elapsedMs: number }) => reports.push(p.elapsedMs) }),
    );
    expect(reports.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < reports.length; i++) {
      expect(reports[i] - reports[i - 1]).toBeGreaterThanOrEqual(200);
    }
  });
});

describe("worker session", () => {
  it("posts progress and then the result", async () => {
    const messages: AdvancedOptimiserOutbound[] = [];
    const handle = createSession((m) => messages.push(m), {
      now: tickingClock(10),
      random: seededRandom(1),
      yieldToEventLoop: async () => {},
    });
    await handle({ type: "start", job, settings: { timeBudgetMs: 2000, patience: 1e9 } });

    const last = messages[messages.length - 1];
    expect(last.type).toBe("result");
    expect(messages.slice(0, -1).every((m) => m.type === "progress")).toBe(true);
    expect(messages.length).toBeGreaterThan(1);
  });

  it("stops at the next checkpoint after a cancel message", async () => {
    const messages: AdvancedOptimiserOutbound[] = [];
    let handle: ReturnType<typeof createSession>;
    let yields = 0;
    handle = createSession((m) => messages.push(m), {
      now: tickingClock(100),
      random: seededRandom(1),
      // The cancel arrives while the search is yielding to the event loop.
      yieldToEventLoop: async () => {
        if (++yields === 2) await handle({ type: "cancel" });
      },
    });
    await handle({ type: "start", job, settings: { timeBudgetMs: 1e9, patience: 1e9 } });

    const last = messages[messages.length - 1];
    expect(last.type).toBe("result");
    if (last.type === "result") {
      expect(last.result.cancelled).toBe(true);
      expect(Object.keys(last.result.gearSet).length).toBeGreaterThan(0);
    }
    expect(yields).toBe(2);
  });

  it("posts an error instead of throwing", async () => {
    const messages: AdvancedOptimiserOutbound[] = [];
    const handle = createSession((m) => messages.push(m));
    await handle({ type: "start", job: { ...job, combinationRule: "missing" as never } });
    expect(messages).toEqual([{ type: "error", message: expect.any(String) }]);
  });
});
