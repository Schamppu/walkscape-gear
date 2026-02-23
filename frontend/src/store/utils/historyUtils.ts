/**
 * Purpose:
 * Shared utilities for integrating stores with the command/history pattern.
 *
 * Responsibilities:
 * - Lazily load the history store (avoids circular dependencies).
 * - Execute a command and record it in history.
 * - Provide a common `initializeHistoryTracking` helper.
 *
 * Does NOT:
 * - Import concrete store implementations.
 * - Contain any game logic.
 */

import type { Command } from "@/store/commands/types";
import type { useHistoryStore as UseHistoryStore } from "@/store/history";

type HistoryStore = ReturnType<typeof UseHistoryStore>;

// ---------------------------------------------------------------------------
// Lazy loader — one shared module-level cache across all imports
// ---------------------------------------------------------------------------

let _useHistoryStore: (() => HistoryStore) | null = null;

export const getHistoryStore = async (): Promise<HistoryStore | null> => {
  if (!_useHistoryStore) {
    try {
      const module = await import("@/store/history");
      _useHistoryStore = module.useHistoryStore as () => HistoryStore;
    } catch {
      console.debug("History store not available");
      return null;
    }
  }
  return _useHistoryStore?.() ?? null;
};

// ---------------------------------------------------------------------------
// Shared action helpers
// ---------------------------------------------------------------------------

/**
 * Execute a command and record it in the history store (if available).
 * @param command - The command to run.
 * @param label   - Optional label used in the error log (e.g. "gear", "activity").
 */
export async function executeCommand(
  command: Command,
  label = "command",
): Promise<void> {
  try {
    const historyStore = await getHistoryStore();
    await command.execute();
    if (historyStore) {
      historyStore.recordCommand(command);
    }
  } catch (error) {
    console.error(`Failed to execute ${label}:`, error);
  }
}

/**
 * Verify that the history store is reachable.
 * Returns `true` when history tracking is available, `false` otherwise.
 * @param label - Optional label used in debug messages.
 */
export async function initializeHistoryTracking(label = ""): Promise<boolean> {
  try {
    const historyStore = await getHistoryStore();
    if (!historyStore) {
      console.debug(
        `History store not available${label ? ` for ${label}` : ""}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.debug(
      `Failed to initialize history tracking${label ? ` for ${label}` : ""}:`,
      error,
    );
    return false;
  }
}
