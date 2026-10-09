/**
 * Purpose:
 * The advanced optimiser's search: prune options, seed with a wide beam
 * search, then hill-climb and restart from perturbed copies of the best set
 * until the time budget or patience runs out.
 *
 * The run is async and yields to the event loop regularly, so a worker can
 * receive a cancel message mid-run. Time and randomness are injected so tests
 * are deterministic.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or touch `self` / `postMessage` (see the worker).
 */

import type { Stat } from "@/domain/types/item";
import type { WorkerGearSet } from "@/workers/optimiserWorkerTypes";
import type { AdvancedOptimiserJob } from "@/workers/advancedOptimiserWorkerTypes";
import { seedCandidates, type Candidate } from "./beam";
import {
  collectSetKeywords,
  countSlots,
  pairMoves,
  perturb,
  setMoves,
  singleMoves,
  type MoveContext,
} from "./moves";
import { pruneDominated } from "./pruning";
import { compareSetScores, createSetScorer, type SetScorer } from "./scorer";
import { unionUsefulStats } from "./stats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchSettings = {
  beamWidth: number;
  timeBudgetMs: number;
  /** Seeds that get a full climb before restarts begin. */
  climbedSeeds: number;
  /** Restarts in a row without improvement before giving up early. */
  patience: number;
  /** Random pair swaps tried per climb round. */
  pairSamples: number;
  /** Slots changed when perturbing the best set for a restart. */
  perturbSlots: number;
  yieldEveryMs: number;
  progressEveryMs: number;
};

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  beamWidth: 50,
  timeBudgetMs: 10_000,
  climbedSeeds: 5,
  patience: 100,
  pairSamples: 200,
  perturbSlots: 3,
  yieldEveryMs: 50,
  progressEveryMs: 200,
};

export type SearchProgress = {
  bestScore: number;
  valid: boolean;
  elapsedMs: number;
  evaluations: number;
};

export type SearchResult = SearchProgress & {
  gearSet: WorkerGearSet;
  values: Record<string, number>;
  /** True when the run ended because `shouldStop` returned true. */
  cancelled: boolean;
};

export type SearchHooks = {
  now: () => number;
  random: () => number;
  shouldStop: () => boolean;
  onProgress?: (progress: SearchProgress) => void;
  /** Defaults to a `setTimeout(0)` promise. */
  yieldToEventLoop?: () => Promise<void>;
};

type ClimbContext = {
  moves: MoveContext;
  score: SetScorer;
  pairSamples: number;
  random: () => number;
};

// ---------------------------------------------------------------------------
// Climbing
// ---------------------------------------------------------------------------

const better = (a: Candidate, b: Candidate): boolean => compareSetScores(a.result, b.result) < 0;

const bestOf = (
  current: Candidate,
  sets: Iterable<WorkerGearSet>,
  score: SetScorer,
): Candidate => {
  let best = current;
  for (const gearSet of sets) {
    const candidate = { gearSet, result: score(gearSet) };
    if (better(candidate, best)) best = candidate;
  }
  return best;
};

/**
 * One hill-climb step: the best single move, else the best set move, else
 * the best sampled pair move. Returns `null` at a local optimum.
 */
export const climbRound = (current: Candidate, ctx: ClimbContext): Candidate | null => {
  const { moves, score } = ctx;
  const rank = (set: WorkerGearSet) => score(set).score;

  for (const neighbours of [
    () => singleMoves(current.gearSet, moves),
    () => setMoves(current.gearSet, moves, rank),
    () => pairMoves(current.gearSet, moves, ctx.pairSamples, ctx.random),
  ]) {
    const best = bestOf(current, neighbours(), score);
    if (best !== current) return best;
  }
  return null;
};

/** Climbs until a local optimum (sync; for tests and small searches). */
export const climb = (start: Candidate, ctx: ClimbContext): Candidate => {
  let current = start;
  for (let next = climbRound(current, ctx); next; next = climbRound(current, ctx)) {
    current = next;
  }
  return current;
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const defaultYield = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export const runSearch = async (
  job: AdvancedOptimiserJob,
  settings: SearchSettings,
  hooks: SearchHooks,
): Promise<SearchResult> => {
  const start = hooks.now();
  const elapsed = () => hooks.now() - start;
  const outOfTime = () => elapsed() >= settings.timeBudgetMs;
  const yieldToEventLoop = hooks.yieldToEventLoop ?? defaultYield;

  let evaluations = 0;
  const scoreSet = createSetScorer(job);
  const score: SetScorer = (set) => {
    evaluations++;
    return scoreSet(set);
  };

  const useful = new Set<string>(unionUsefulStats(job.targets));
  const options = pruneDominated(
    job.options,
    countSlots(job.searchSlots),
    (stat: Stat) => useful.has(stat.stat),
  );
  const prunedJob = { ...job, options };

  const ctx: ClimbContext = {
    moves: {
      slots: job.searchSlots,
      options,
      locations: job.locations,
      keywordsMap: job.keywordsMap,
      setKeywords: collectSetKeywords(options),
    },
    score,
    pairSamples: settings.pairSamples,
    random: hooks.random,
  };

  const seeds = seedCandidates(prunedJob, score, settings.beamWidth);
  let best = seeds[0];

  let lastYield = hooks.now();
  let lastProgress = Number.NEGATIVE_INFINITY;
  let cancelled = false;

  const progress = (): SearchProgress => ({
    bestScore: best.result.score,
    valid: best.result.valid,
    elapsedMs: elapsed(),
    evaluations,
  });

  /** Yields and reports progress when due. Returns false when the run must stop. */
  const checkpoint = async (): Promise<boolean> => {
    if (cancelled || outOfTime()) return false;
    if (hooks.now() - lastYield >= settings.yieldEveryMs) {
      await yieldToEventLoop();
      lastYield = hooks.now();
    }
    if (hooks.onProgress && hooks.now() - lastProgress >= settings.progressEveryMs) {
      hooks.onProgress(progress());
      lastProgress = hooks.now();
    }
    if (hooks.shouldStop()) cancelled = true;
    return !cancelled && !outOfTime();
  };

  /** Climbs from `from` round by round, stopping early when the run must stop. */
  const climbAsync = async (from: Candidate): Promise<Candidate> => {
    let current = from;
    while (await checkpoint()) {
      const next = climbRound(current, ctx);
      if (!next) break;
      current = next;
    }
    return current;
  };

  for (const seed of seeds.slice(0, settings.climbedSeeds)) {
    if (!(await checkpoint())) break;
    const climbed = await climbAsync(seed);
    if (better(climbed, best)) best = climbed;
  }

  let sinceImprovement = 0;
  while (sinceImprovement < settings.patience && (await checkpoint())) {
    const restart = perturb(best.gearSet, ctx.moves, settings.perturbSlots, hooks.random);
    const climbed = await climbAsync({ gearSet: restart, result: score(restart) });
    if (better(climbed, best)) {
      best = climbed;
      sinceImprovement = 0;
    } else {
      sinceImprovement++;
    }
  }

  return {
    ...progress(),
    gearSet: best.gearSet,
    values: best.result.values,
    cancelled,
  };
};
