import { computed, type ComputedRef, type Ref } from "vue";

export type WsButtonVariant = "default" | "secondary" | "icon-only";

const wsButtonVariantClassMap: Record<WsButtonVariant, string> = {
  default: "",
  secondary: "button--secondary",
  "icon-only": "button--icon-only",
};

export function useWsButton(variant: Ref<WsButtonVariant>): {
  variantClass: ComputedRef<string>;
} {
  const variantClass = computed<string>(() => wsButtonVariantClassMap[variant.value]);

  return {
    variantClass,
  };
}
