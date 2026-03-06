<script setup lang="ts">
import { ref, computed } from "vue";

let idCounter = 0;

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
    /** Readable label for the toggle button, used by screen readers. */
    ariaLabel?: string;
  }>(),
  {
    modelValue: undefined,
    disabled: false,
    ariaLabel: "Toggle details",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const instanceId = `ws-expandable-${++idCounter}`;
const contentId = `${instanceId}-content`;

const internalOpen = ref(false);

const isOpen = computed<boolean>(() => {
  return props.modelValue !== undefined ? props.modelValue : internalOpen.value;
});

const toggle = (): void => {
  if (props.disabled) return;
  const next = !isOpen.value;
  if (props.modelValue !== undefined) {
    emit("update:modelValue", next);
  } else {
    internalOpen.value = next;
  }
};
</script>

<template>
  <div class="ws-expandable">
    <div class="ws-expandable__header">
      <slot name="header" :is-open="isOpen" />
      <button
        v-if="!disabled"
        class="ws-expandable__chevron"
        type="button"
        :aria-expanded="isOpen"
        :aria-controls="contentId"
        :aria-label="ariaLabel"
        @click.stop="toggle"
      >
        <span aria-hidden="true">{{ isOpen ? "▲" : "▼" }}</span>
      </button>
    </div>
    <div
      v-if="isOpen"
      :id="contentId"
      class="ws-expandable__content"
      role="region"
      :aria-label="ariaLabel"
    >
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ws-expandable {
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    width: 100%;
  }

  &__chevron {
    cursor: pointer;
    margin-left: auto;
    padding: 0 $xs;
    color: $txPrimary !important;
    background: none;
    border: none;
    font: inherit;

    &:hover,
    &:focus {
      opacity: 0.8;
    }
  }
}
</style>
