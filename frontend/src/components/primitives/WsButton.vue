<script setup lang="ts">
import { computed, toRef } from "vue";
import {
  useWsButton,
  type WsButtonVariant,
} from "../../composables/useWsButton";
import type { IconSizeKey } from "../../constants/iconSizes";
import WsIcon from "./WsIcon.vue";

const props = withDefaults(
  defineProps<{
    text?: string;
    iconPath?: string | null;
    iconSize?: IconSizeKey;
    variant?: WsButtonVariant;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
  }>(),
  {
    text: "",
    iconPath: "",
    iconSize: "sm",
    variant: "default",
    disabled: false,
    type: "button",
    ariaLabel: "",
  },
);

const emit = defineEmits<{
  (event: "click", payload: MouseEvent): void;
}>();

const { variantClass } = useWsButton(toRef(props, "variant"));
const computedAriaLabel = computed<string | undefined>(
  () => props.ariaLabel || props.text || undefined,
);

const handleClick = (event: MouseEvent): void => {
  if (props.disabled) {
    return;
  }
  emit("click", event);
};
</script>

<template>
  <button
    @click="handleClick"
    class="button"
    :class="variantClass"
    :type="type"
    :disabled="disabled"
    :aria-label="computedAriaLabel"
  >
    <ws-icon v-if="iconPath" :icon-path="iconPath" :size="iconSize" />
    <slot>{{ text }}</slot>
  </button>
</template>

<style lang="scss" scoped>
.button {
  cursor: pointer;

  display: flex;
  align-items: center;
  align-self: center;
  gap: $xxxxs;
  padding: $xxxs;

  word-wrap: nowrap;

  background-color: $boxDarkBackground;
  border: 1px solid $boxDarkOutline;
  border-radius: $md;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }

  &:focus-visible {
    outline: 2px solid $chipOutline;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.button--secondary {
  background-color: transparent;

  &:hover,
  &:focus {
    background-color: $boxTransparentDarkOutline;
  }
}

.button--icon-only {
  padding: $xxxs;
}
</style>
