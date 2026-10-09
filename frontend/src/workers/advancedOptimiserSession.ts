/**
 * Purpose:
 * Message handling for the advanced optimiser worker, kept separate from the
 * worker entry point so it can be tested without a real `Worker`.
 *
 * A `start` message runs a search and posts `progress` messages followed by a
 * `result`. A `cancel` message makes the running search stop at its next
 * checkpoint and post the best set found so far.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access stores.
 */

import {
  DEFAULT_SEARCH_SETTINGS,
  runSearch,
  type SearchHooks,
} from "@/domain/advancedOptimiser/search";
import type {
  AdvancedOptimiserInbound,
  AdvancedOptimiserOutbound,
} from "./advancedOptimiserWorkerTypes";

export type SessionOptions = Partial<Pick<SearchHooks, "now" | "random" | "yieldToEventLoop">>;

/**
 * Returns the `onmessage` handler. It resolves once a started search has
 * posted its result (or error), which tests can await.
 */
export const createSession = (
  post: (message: AdvancedOptimiserOutbound) => void,
  options: SessionOptions = {},
) => {
  let cancelled = false;

  return async (message: AdvancedOptimiserInbound): Promise<void> => {
    if (message.type === "cancel") {
      cancelled = true;
      return;
    }

    cancelled = false;
    try {
      const result = await runSearch(
        message.job,
        { ...DEFAULT_SEARCH_SETTINGS, ...message.settings },
        {
          now: options.now ?? (() => performance.now()),
          random: options.random ?? Math.random,
          yieldToEventLoop: options.yieldToEventLoop,
          shouldStop: () => cancelled,
          onProgress: (progress) => post({ type: "progress", progress }),
        },
      );
      post({ type: "result", result });
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };
};
