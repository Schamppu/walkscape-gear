import type { SearchProgress, SearchResult, SearchSettings } from "@/domain/advancedOptimiser/search";
import type {
  AdvancedOptimiserInbound,
  AdvancedOptimiserJob,
  AdvancedOptimiserOutbound,
} from "@/workers/advancedOptimiserWorkerTypes";

/** The parts of `Worker` the runner uses (a fake can stand in for tests). */
export type WorkerLike = {
  postMessage: (message: AdvancedOptimiserInbound) => void;
  onmessage: ((e: MessageEvent<AdvancedOptimiserOutbound>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  terminate: () => void;
};

export type RunningJob = {
  /** Resolves with the best set found; also after a cancel (`cancelled: true`). */
  result: Promise<SearchResult>;
  cancel: () => void;
};

export const createAdvancedWorker = (): WorkerLike =>
  new Worker(new URL("../../workers/advancedOptimiser.worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as WorkerLike;

/**
 * Starts `job` on a new worker. Progress messages go to `onProgress`; the
 * worker is terminated once a result or error arrives.
 */
export const runAdvancedJob = (
  job: AdvancedOptimiserJob,
  {
    createWorker = createAdvancedWorker,
    onProgress,
    settings,
  }: {
    createWorker?: () => WorkerLike;
    onProgress?: (progress: SearchProgress) => void;
    settings?: Partial<SearchSettings>;
  } = {},
): RunningJob => {
  const worker = createWorker();
  let done = false;

  const result = new Promise<SearchResult>((resolve, reject) => {
    const finish = () => {
      done = true;
      worker.terminate();
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        onProgress?.(data.progress);
      } else if (data.type === "result") {
        finish();
        resolve(data.result);
      } else {
        finish();
        reject(new Error(`Advanced optimiser failed: ${data.message}`));
      }
    };
    worker.onerror = (e) => {
      finish();
      reject(new Error(`Advanced optimiser worker error: ${e.message}`));
    };
    worker.postMessage({ type: "start", job, settings });
  });

  return {
    result,
    cancel: () => {
      if (!done) worker.postMessage({ type: "cancel" });
    },
  };
};
