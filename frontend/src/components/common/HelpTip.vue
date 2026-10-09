<script setup lang="ts">
import { ref, useId } from "vue";

/**
 * A small "?" button that explains something in a tooltip. Shows on hover and
 * keyboard focus; tapping toggles it (touch screens have no hover). Closes on
 * Escape or a click elsewhere.
 */
defineProps<{
  /** The explanation shown in the tooltip. */
  text: string;
  /** What the help is about, for screen readers ("Help: …"). */
  label?: string;
}>();

const id = useId();
const pinned = ref(false);
const hovered = ref(false);
const focused = ref(false);

const toggle = (): void => {
  pinned.value = !pinned.value;
};

const close = (): void => {
  pinned.value = false;
  hovered.value = false;
};
</script>

<template>
  <span
    class="help-tip"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <button
      v-click-outside="{ handler: close, esc: false }"
      type="button"
      class="trigger"
      :aria-label="label ? `Help: ${label}` : 'Help'"
      :aria-describedby="id"
      :aria-expanded="pinned"
      @click.stop.prevent="toggle"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.escape="close"
    >
      ?
    </button>
    <span
      v-show="pinned || hovered || focused"
      :id="id"
      role="tooltip"
      class="tooltip"
    >
      {{ text }}
    </span>
  </span>
</template>

<style lang="scss" scoped>
.help-tip {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.trigger {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  border: 1px solid $boxDarkOutline;
  background: $boxDarkBackground;
  color: $txPrimary;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &:focus-visible {
    background: $boxTransparentDarkOutline;
  }
}

.tooltip {
  position: absolute;
  top: calc(100% + #{$xxs});
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: max-content;
  max-width: min(16rem, 70vw);
  padding: $xs $sm;
  border-radius: $xs;
  border: 1px solid $boxDarkOutline;
  background: $boxDarkBackground;
  color: $txPrimary;
  font-size: 0.875rem;
  font-weight: normal;
  line-height: 1.4;
  text-align: left;
  white-space: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
</style>
