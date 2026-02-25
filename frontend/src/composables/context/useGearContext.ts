import { computed, type ComputedRef, type Ref } from "vue";
import { injectBaseContext } from "./injectShared";
import type { BaseContext } from "./useBaseContext";
import { useGearStore } from "@/store/gear";
import type { LocationDetail } from "@/domain/types/location";
import type { ServiceDetail } from "@/domain/types/service";

export type GearContextOverrides = {
  location?: Ref<LocationDetail | null>;
  service?: Ref<ServiceDetail | null>;
};

function fallback<T>(
  primary: Ref<T> | undefined,
  fallbackRef: ComputedRef<T>,
): ComputedRef<T> {
  return computed(() => primary?.value ?? fallbackRef.value);
}

export function useGearContext(
  gearSetIndex: number,
  overrides: GearContextOverrides = {},
): BaseContext {
  const baseCtx = injectBaseContext();
  const gearStore = useGearStore();

  return {
    ...baseCtx,

    location: fallback(overrides.location, baseCtx.location),
    service: fallback(overrides.service, baseCtx.service),

    gearSlots: computed(() => gearStore.gearset(gearSetIndex)),
    equippedGear: computed(() => gearStore.equippedGearByIndex(gearSetIndex)),
    filledGearSlots: computed(() =>
      gearStore.filledGearSlotsByIndex(gearSetIndex)
    ),
  };
}
