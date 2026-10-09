/**
 * Purpose:
 * Web Worker running the advanced optimiser search off the main thread.
 * Protocol: see `AdvancedOptimiserInbound` / `AdvancedOptimiserOutbound`.
 *
 * Does NOT:
 * - Import Vue / reactive APIs or access Pinia stores.
 */

import { createSession } from "./advancedOptimiserSession";
import type {
  AdvancedOptimiserInbound,
  AdvancedOptimiserOutbound,
} from "./advancedOptimiserWorkerTypes";

const handle = createSession((message: AdvancedOptimiserOutbound) => self.postMessage(message));

self.onmessage = (e: MessageEvent<AdvancedOptimiserInbound>) => {
  void handle(e.data);
};
