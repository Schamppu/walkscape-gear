import { describe, it } from "vitest";
import {
  DEFAULT_SEARCH_SETTINGS,
  runSearch,
  type SearchSettings,
} from "@/domain/advancedOptimiser/search";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import { QUICK_SEARCH_SETTINGS } from "@/domain/advancedOptimiser/quickSet";
import { seededRandom } from "../../fixtures/advancedOptimiser";

// Tuning benchmark on real jobs exported from the app (see
// test/fixtures/advancedOptimiser/jobs/README.md). Opt-in and slow:
//   BENCH=1 npx vitest run benchmark
//   BENCH=1 BENCH_VARIANTS=quick,default npx vitest run benchmark
// For each job: a long reference run gives the best-known score, then each
// settings variant runs under the normal budget. The table shows how far each
// variant ends from the reference (negative = it beat the reference), how long
// it took and how many sets it tried.

const jobs = import.meta.glob<AdvancedOptimiserJob>("../../fixtures/advancedOptimiser/jobs/*.json", {
  eager: true,
  import: "default",
});

const REFERENCE: Partial<SearchSettings> = { timeBudgetMs: 60_000, patience: 1_000, beamWidth: 100 };

const ALL_VARIANTS: Record<string, Partial<SearchSettings>> = {
  default: {},
  quick: QUICK_SEARCH_SETTINGS,
  "beam 10": { beamWidth: 10 },
  "beam 25": { beamWidth: 25 },
  "beam 100": { beamWidth: 100 },
  "patience 25": { patience: 25 },
  "patience 300": { patience: 300 },
  "pairs 50": { pairSamples: 50 },
  "pairs 500": { pairSamples: 500 },
  "budget 5s": { timeBudgetMs: 5_000 },
};

// BENCH_VARIANTS=quick,default runs only those variants.
const only = process.env.BENCH_VARIANTS?.split(",");
const VARIANTS = only
  ? Object.fromEntries(Object.entries(ALL_VARIANTS).filter(([name]) => only.includes(name)))
  : ALL_VARIANTS;

const run = (job: AdvancedOptimiserJob, settings: Partial<SearchSettings>, seed = 1) =>
  runSearch(
    job,
    { ...DEFAULT_SEARCH_SETTINGS, ...settings },
    { now: () => performance.now(), random: seededRandom(seed), shouldStop: () => false },
  );

const entries = Object.entries(jobs);

describe.skipIf(!process.env.BENCH || entries.length === 0)("tuning benchmark", () => {
  it.each(entries.map(([path, job]) => [path.split("/").pop()!, job] as const))(
    "%s",
    async (_, job) => {
      const reference = await run(job, REFERENCE);
      const rows: Record<string, unknown>[] = [];

      for (const [name, settings] of Object.entries(VARIANTS)) {
        const results = [];
        for (const seed of [1, 2, 3]) results.push(await run(job, settings, seed));
        const gaps = results.map((r) => (reference.bestScore - r.bestScore) / reference.bestScore);
        const times = results.map((r) => r.elapsedMs);
        rows.push({
          variant: name,
          "worst gap %": (Math.max(...gaps) * 100).toFixed(2),
          "mean gap %": ((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 100).toFixed(2),
          "max time s": (Math.max(...times) / 1000).toFixed(2),
          "sets tried": Math.round(results.reduce((a, r) => a + r.evaluations, 0) / results.length),
        });
      }

      console.log(`\n${_}: reference ${reference.bestScore.toFixed(4)} (+${(reference.improvement * 100).toFixed(1)}%)`);
      console.table(rows);
    },
    15 * 60_000,
  );
});
