import { describe, it, expect, vi } from "vitest";
import { runAdvancedJob, type WorkerLike } from "@/composables/advancedOptimiser/runWorker";
import { applySearchResult } from "@/composables/advancedOptimiser/applyResult";
import { createSession } from "@/workers/advancedOptimiserSession";
import type { SearchResult } from "@/domain/advancedOptimiser/search";
import type {
  AdvancedOptimiserInbound,
  AdvancedOptimiserOutbound,
} from "@/workers/advancedOptimiserWorkerTypes";
import {
  makeJob,
  makeLocationSummary,
  makeWorkerItem,
  seededRandom,
  tickingClock,
} from "../../fixtures/advancedOptimiser";

const job = makeJob({
  searchSlots: ["head", "chest"],
  options: {
    head: [makeWorkerItem("small_hat", [{ type: "workEfficiency", value: 0.1 }]),
      makeWorkerItem("big_hat", [{ type: "workEfficiency", value: 0.4 }])],
    chest: [makeWorkerItem("big_chest", [{ type: "workEfficiency", value: 0.3 }])],
  },
});

/** A worker whose messages are scripted by the test. */
class ScriptedWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  sent: AdvancedOptimiserInbound[] = [];
  terminated = false;
  postMessage(message: AdvancedOptimiserInbound) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: AdvancedOptimiserOutbound) {
    this.onmessage?.({ data } as MessageEvent<AdvancedOptimiserOutbound>);
  }
}

/** A worker running the real session in-process. */
class InProcessWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  terminated = false;
  private handle = createSession(
    (data) => queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<AdvancedOptimiserOutbound>)),
    { now: tickingClock(10), random: seededRandom(1), yieldToEventLoop: () => Promise.resolve() },
  );
  postMessage(message: AdvancedOptimiserInbound) {
    void this.handle(message);
  }
  terminate() {
    this.terminated = true;
  }
}

const fakeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  bestScore: 2,
  improvement: 1,
  valid: true,
  elapsedMs: 10,
  evaluations: 5,
  gearSet: {},
  values: {},
  ratios: {},
  cancelled: false,
  ...overrides,
});

describe("runAdvancedJob", () => {
  it("starts the job, forwards progress and resolves with the result", async () => {
    const worker = new ScriptedWorker();
    const onProgress = vi.fn();
    const running = runAdvancedJob(job, { createWorker: () => worker, onProgress });

    expect(worker.sent).toEqual([{ type: "start", job, settings: undefined }]);
    worker.emit({ type: "progress", progress: { bestScore: 1.5, improvement: 0.5, valid: true, elapsedMs: 5, evaluations: 3 } });
    worker.emit({ type: "result", result: fakeResult() });

    await expect(running.result).resolves.toEqual(fakeResult());
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ bestScore: 1.5 }));
    expect(worker.terminated).toBe(true);
  });

  it("sends cancel to a running worker but not to a finished one", async () => {
    const worker = new ScriptedWorker();
    const running = runAdvancedJob(job, { createWorker: () => worker });
    running.cancel();
    expect(worker.sent.at(-1)).toEqual({ type: "cancel" });

    worker.emit({ type: "result", result: fakeResult({ cancelled: true }) });
    await running.result;
    running.cancel();
    expect(worker.sent.filter((m) => m.type === "cancel")).toHaveLength(1);
  });

  it("rejects on a worker error message", async () => {
    const worker = new ScriptedWorker();
    const running = runAdvancedJob(job, { createWorker: () => worker });
    worker.emit({ type: "error", message: "boom" });
    await expect(running.result).rejects.toThrow("boom");
    expect(worker.terminated).toBe(true);
  });

  it("runs a real search through the worker session", async () => {
    const worker = new InProcessWorker();
    const running = runAdvancedJob(job, {
      createWorker: () => worker,
      settings: { timeBudgetMs: 2000, patience: 5 },
    });
    const result = await running.result;
    expect((result.gearSet.head as { id: string }).id).toBe("big_hat");
    expect((result.gearSet.chest as { id: string }).id).toBe("big_chest");
    expect(worker.terminated).toBe(true);
  });
});

describe("applySearchResult", () => {
  const targets = () => ({
    setLocation: vi.fn(),
    equipMultiple: vi.fn(() => Promise.resolve()),
  });

  it("equips every search slot, emptying ones the result leaves empty", async () => {
    const t = targets();
    const hat = makeWorkerItem("big_hat");
    const applied = await applySearchResult(fakeResult({ gearSet: { head: hat } }), ["head", "chest"], t);
    expect(applied).toBe(true);
    expect(t.equipMultiple).toHaveBeenCalledWith(
      { head: { id: "big_hat", quality: "common" }, chest: null },
      true,
    );
  });

  it("never touches slots outside the search (locked slots)", async () => {
    const t = targets();
    const locked = makeWorkerItem("locked_hat");
    await applySearchResult(fakeResult({ gearSet: { head: locked } }), ["chest"], t);
    expect(t.equipMultiple).toHaveBeenCalledWith({ chest: null }, true);
  });

  it("switches to the result's location", async () => {
    const t = targets();
    const reef = makeLocationSummary("reef", "syrenthia");
    await applySearchResult(fakeResult({ gearSet: { location: reef } }), [], t);
    expect(t.setLocation).toHaveBeenCalledWith(reef);
  });

  it("leaves the gear set alone for a cancelled run", async () => {
    const t = targets();
    const applied = await applySearchResult(fakeResult({ cancelled: true }), ["head"], t);
    expect(applied).toBe(false);
    expect(t.equipMultiple).not.toHaveBeenCalled();
    expect(t.setLocation).not.toHaveBeenCalled();
  });
});
