import { computed, type ComputedRef, type Ref } from "vue";
import { wsButtonVariantClassMap, type WsButtonVariant } from "@/constants/wsButton";

export function useWsButton(variant: Ref<WsButtonVariant>): {
  variantClass: ComputedRef<string>;
} {
  const variantClass = computed<string>(() => wsButtonVariantClassMap[variant.value]);

  return {
    variantClass,
  };
}
