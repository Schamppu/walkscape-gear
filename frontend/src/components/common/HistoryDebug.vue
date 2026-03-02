<script setup>
import { computed } from "vue";
import { useHistoryStore } from "@/store/history";

const historyStore = useHistoryStore();

const history = computed(() => historyStore.getHistorySummary());
const canUndo = computed(() => historyStore.canUndo);
const canRedo = computed(() => historyStore.canRedo);
const currentIndex = computed(() => historyStore.currentIndex);
const historyLength = computed(() => historyStore.historyLength);
</script>

<template>
  <div class="history-debug">
    <h3>History Debug Panel</h3>

    <div class="history-info">
      <p><strong>Can Undo:</strong> {{ canUndo }}</p>
      <p><strong>Can Redo:</strong> {{ canRedo }}</p>
      <p><strong>Current Index:</strong> {{ currentIndex }}</p>
      <p><strong>History Length:</strong> {{ historyLength }}</p>
    </div>

    <div class="history-list">
      <h4>Command History:</h4>
      <div v-if="history.length === 0" class="no-history">
        No commands executed yet
      </div>
      <ul v-else>
        <li
          v-for="entry in history"
          :key="entry.index"
          :class="{
            current: entry.isCurrent,
            next: entry.isNext,
            executed: entry.isCurrent,
          }"
        >
          <span class="index">{{ entry.index }}</span>
          <span class="description">{{ entry.description }}</span>
          <span class="timestamp">{{ entry.timestamp }}</span>
          <span class="status">
            {{ entry.isCurrent ? "✓" : entry.isNext ? "→" : "" }}
          </span>
        </li>
      </ul>
    </div>

    <div class="actions">
      <button :disabled="!canUndo" @click="historyStore.undo()">Undo</button>
      <button :disabled="!canRedo" @click="historyStore.redo()">Redo</button>
      <button @click="historyStore.clearHistory()">Clear History</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.history-debug {
  padding: $base;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-surface);
  font-size: 0.875rem;

  h3,
  h4 {
    margin: 0 0 $sm 0;
    color: var(--color-text-primary);
  }

  .history-info {
    margin-bottom: $base;

    p {
      margin: $xs 0;
    }
  }

  .history-list {
    margin-bottom: $base;

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    li {
      display: flex;
      gap: $sm;
      padding: $xs $sm;
      border-radius: $xs;

      &.current {
        background: var(--color-success);
        color: white;
        font-weight: bold;
      }

      &.next {
        background: var(--color-warning);
        color: white;
      }

      .index {
        min-width: 20px;
        font-family: monospace;
      }

      .description {
        flex: 1;
      }

      .timestamp {
        font-family: monospace;
        opacity: 0.7;
        font-size: 0.8em;
      }

      .status {
        min-width: 20px;
        font-weight: bold;
      }
    }
  }

  .no-history {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .actions {
    display: flex;
    gap: $sm;

    button {
      padding: $xs $sm;
      border: 1px solid var(--color-border);
      border-radius: $xs;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: var(--color-surface-hover);
      }
    }
  }
}
</style>
