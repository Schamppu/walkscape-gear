import { defineStore } from "pinia";
import type { Command } from "./commands/types";

/**
 * History Store for managing undo/redo command history.
 *
 * Responsibilities:
 * - Maintain a stack of executed commands with their undo/redo logic.
 * - Track the current position in the history for undo/redo operations.
 * - Provide actions to record new commands, undo, redo, and clear history.
 *
 * Does NOT:
 * - Implement the actual command logic (commands should be defined elsewhere and passed in).
 * - Handle UI state directly (UI components should interact with this store to determine
 *   if undo/redo is possible and to trigger actions).
 */

/** A command that has been recorded into history (timestamp is guaranteed). */
type RecordedCommand = Command & { timestamp: number };

export const useHistoryStore = defineStore("historyStore", {
  state: () => ({
    commandHistory: [] as RecordedCommand[],
    currentIndex: -1,
    maxHistorySize: 50,
    isUndoRedoInProgress: false,
  }),

  getters: {
    canUndo: (state): boolean => state.currentIndex >= 0,
    canRedo: (state): boolean =>
      state.currentIndex < state.commandHistory.length - 1,

    historyLength: (state): number => state.commandHistory.length,

    undoDescription: (state): string | null => {
      if (state.currentIndex < 0) return null;
      return state.commandHistory[state.currentIndex]?.description ?? "Undo";
    },

    redoDescription: (state): string | null => {
      if (state.currentIndex >= state.commandHistory.length - 1) return null;
      return state.commandHistory[state.currentIndex + 1]?.description ?? "Redo";
    },
  },

  actions: {
    recordCommand(command: Command): void {
      if (this.isUndoRedoInProgress) return;

      if (!command.execute || !command.undo || !command.description) {
        console.error("Invalid command structure:", command);
        return;
      }

      // Discard any future states when branching from mid-history
      if (this.currentIndex < this.commandHistory.length - 1) {
        this.commandHistory = this.commandHistory.slice(0, this.currentIndex + 1);
      }

      const recorded = command as RecordedCommand;
      recorded.timestamp = Date.now();
      this.commandHistory.push(recorded);
      this.currentIndex = this.commandHistory.length - 1;

      // Trim oldest entries if over the size limit
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
        this.currentIndex = this.commandHistory.length - 1;
      }
    },

    async undo(): Promise<boolean> {
      if (!this.canUndo) return false;

      this.isUndoRedoInProgress = true;
      try {
        await this.commandHistory[this.currentIndex].undo();
        this.currentIndex--;
        return true;
      } catch (error) {
        console.error("Failed to undo:", error);
        return false;
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    async redo(): Promise<boolean> {
      if (!this.canRedo) return false;

      this.isUndoRedoInProgress = true;
      try {
        await this.commandHistory[this.currentIndex + 1].execute();
        this.currentIndex++;
        return true;
      } catch (error) {
        console.error("Failed to redo:", error);
        return false;
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    clearHistory(): void {
      this.commandHistory = [];
      this.currentIndex = -1;
    },

    getHistorySummary(): Array<{
      index: number;
      description: string;
      timestamp: string;
      isCurrent: boolean;
      isNext: boolean;
    }> {
      return this.commandHistory.map((command, index) => ({
        index,
        description: command.description,
        timestamp: new Date(command.timestamp).toLocaleTimeString(),
        isCurrent: index <= this.currentIndex,
        isNext: index === this.currentIndex + 1,
      }));
    },
  },
});
