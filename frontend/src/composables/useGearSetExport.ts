import type { Ref } from "vue";
import { getOldItemIds } from "../utils/axios/api_routes";
import type { EquippedItem } from "@/store/gear";
import {
  buildExportedSlot,
  encodeGearSet,
  decodeGearSet,
  type ImportResult,
} from "@/domain/gearSetExport";

export type { ImportResult };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GearSetExportContext = {
  gearSlots: Ref<Record<string, EquippedItem | null>>;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useGearSetExport(ctx: GearSetExportContext): {
  exportCode: () => Promise<string>;
  importCode: (code: string) => ImportResult;
} {
  const exportCode = async (): Promise<string> => {
    const excluded = ["consumable", "potion", "service"];
    const slotKeys = Object.keys(ctx.gearSlots.value).filter(
      (key) => !excluded.includes(key),
    );

    const itemIds = slotKeys
      .map((key) => ctx.gearSlots.value[key]?.id)
      .filter(Boolean) as string[];

    const { data: itemIdMap } = await getOldItemIds(itemIds);

    const slots = slotKeys.map((slotName) =>
      buildExportedSlot(slotName, ctx.gearSlots.value[slotName] ?? null, itemIdMap),
    );

    return encodeGearSet(slots);
  };

  const importCode = (code: string): ImportResult => decodeGearSet(code);

  return { exportCode, importCode };
}
