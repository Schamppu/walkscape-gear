<script setup lang="ts">
import PrimitiveWsButton from "@/components/primitives/WsButton.vue";
import type { IconSizeKey } from "@/constants/iconSizes";
import type { WsButtonVariant } from "@/constants/wsButton";

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

const handleClick = (event: MouseEvent): void => {
  emit("click", event);
};
</script>

<template>
  <primitive-ws-button v-bind="props" @click="handleClick">
    <slot />
  </primitive-ws-button>
</template>
