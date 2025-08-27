<script setup>
import { computed } from "vue";
import { useHistoryStore } from "@/store/history";

const historyStore = useHistoryStore();

// Props for customization
const props = defineProps({
  // Show buttons horizontally or vertically
  direction: {
    type: String,
    default: "horizontal", // 'horizontal' or 'vertical'
    validator: (value) => ["horizontal", "vertical"].includes(value),
  },
  // Show tooltips with descriptions
  showTooltips: {
    type: Boolean,
    default: true,
  },
  // Size of buttons
  size: {
    type: String,
    default: "medium", // 'small', 'medium', 'large'
    validator: (value) => ["small", "medium", "large"].includes(value),
  },
  // Style variant
  variant: {
    type: String,
    default: "default", // 'default', 'minimal', 'icon-only'
    validator: (value) => ["default", "minimal", "icon-only"].includes(value),
  },
});

const canUndo = computed(() => historyStore.canUndo);
const canRedo = computed(() => historyStore.canRedo);
const undoDescription = computed(() => historyStore.undoDescription);
const redoDescription = computed(() => historyStore.redoDescription);

const handleUndo = () => {
  historyStore.undo();
};

const handleRedo = () => {
  historyStore.redo();
};

// Computed classes for styling
const containerClass = computed(() => [
  "undo-redo-buttons",
  `undo-redo-buttons--${props.direction}`,
  `undo-redo-buttons--${props.size}`,
  `undo-redo-buttons--${props.variant}`,
]);
</script>

<template>
  <div :class="containerClass">
    <button
      :disabled="!canUndo"
      :title="showTooltips ? undoDescription : undefined"
      class="undo-redo-button undo-button"
      @click="handleUndo"
    >
      <span class="button-icon">↶</span>
      <span v-if="variant !== 'icon-only'" class="button-text">Undo</span>
    </button>

    <button
      :disabled="!canRedo"
      :title="showTooltips ? redoDescription : undefined"
      class="undo-redo-button redo-button"
      @click="handleRedo"
    >
      <span class="button-icon">↷</span>
      <span v-if="variant !== 'icon-only'" class="button-text">Redo</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.undo-redo-buttons {
  display: flex;
  justify-content: center;
  gap: $sm;

  &--horizontal {
    flex-direction: row;
  }

  &--vertical {
    flex-direction: column;
  }

  &--small {
    .undo-redo-button {
      padding: $xs $sm;
      font-size: 0.875rem;
    }
  }

  &--medium {
    .undo-redo-button {
      padding: $sm $base;
      font-size: 1rem;
    }
  }

  &--large {
    .undo-redo-button {
      padding: $base $lg;
      font-size: 1.125rem;
    }
  }

  &--icon-only {
    .undo-redo-button {
      padding: $sm;
      aspect-ratio: 1;
      
      .button-icon {
        font-size: 1.2em;
      }
    }
  }
}

.undo-redo-button {
  display: flex;
  align-items: center;
  gap: $xs;
  
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--color-surface-hover);
    border-color: var(--color-border-hover);
  }

  &:active:not(:disabled) {
    background: var(--color-surface-active);
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-surface-disabled);
    color: var(--color-text-disabled);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

.button-icon {
  font-size: 1.1em;
  font-weight: bold;
}

.button-text {
  font-weight: 500;
}

// Minimal variant
.undo-redo-buttons--minimal {
  .undo-redo-button {
    background: transparent;
    border: none;
    padding: $xs $sm;

    &:hover:not(:disabled) {
      background: var(--color-surface-hover);
    }

    &:disabled {
      background: transparent;
    }
  }
}

// Specific button styling
.undo-button {
  .button-icon {
    color: var(--color-primary);
  }
}

.redo-button {
  .button-icon {
    color: var(--color-secondary);
  }
}
</style>
