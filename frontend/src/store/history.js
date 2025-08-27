import { defineStore } from "pinia";

export const useHistoryStore = defineStore("historyStore", {
  state: () => ({
    // Array of command objects - each entry contains action and reverse action
    commandHistory: [],
    // Current position in history (0 = oldest, commandHistory.length-1 = newest)
    currentIndex: -1,
    // Maximum number of commands to keep
    maxHistorySize: 50,
    // Flag to prevent recording changes during undo/redo operations
    isUndoRedoInProgress: false,
  }),

  getters: {
    canUndo: (state) => state.currentIndex >= 0,
    canRedo: (state) => state.currentIndex < state.commandHistory.length - 1,
    
    historyLength: (state) => state.commandHistory.length,
    
    undoDescription: (state) => {
      if (!state.canUndo) return null;
      return state.commandHistory[state.currentIndex]?.description || "Undo";
    },
    
    redoDescription: (state) => {
      if (!state.canRedo) return null;
      return state.commandHistory[state.currentIndex + 1]?.description || "Redo";
    },
  },

  actions: {
    // Record a new command in history
    recordCommand(command) {
      if (this.isUndoRedoInProgress) {
        return;
      }

      // Validate command structure
      if (!command.execute || !command.undo || !command.description) {
        console.error("Invalid command structure:", command);
        return;
      }

      // If we're not at the end of history, remove everything after current position
      if (this.currentIndex < this.commandHistory.length - 1) {
        this.commandHistory = this.commandHistory.slice(0, this.currentIndex + 1);
      }

      // Add new command (preserve the original command object with its methods)
      command.timestamp = Date.now();
      this.commandHistory.push(command);
      this.currentIndex = this.commandHistory.length - 1;

      // Trim history if it exceeds max size
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
        this.currentIndex = this.commandHistory.length - 1;
      }
    },

    // Undo the current command
    async undo() {
      if (!this.canUndo) return false;

      this.isUndoRedoInProgress = true;
      
      try {
        const command = this.commandHistory[this.currentIndex];
        await command.undo();
        this.currentIndex--;
        return true;
      } catch (error) {
        console.error("Failed to undo:", error);
        return false;
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    // Redo the next command
    async redo() {
      if (!this.canRedo) return false;

      this.isUndoRedoInProgress = true;
      
      try {
        const command = this.commandHistory[this.currentIndex + 1];
        await command.execute();
        this.currentIndex++;
        return true;
      } catch (error) {
        console.error("Failed to redo:", error);
        return false;
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    // Clear all history
    clearHistory() {
      this.commandHistory = [];
      this.currentIndex = -1;
    },

    // Get history summary for debugging
    getHistorySummary() {
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
