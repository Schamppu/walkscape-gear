import type { Ref } from "vue";
import { getOldItemIds } from "../utils/axios/api_routes";
import { getGearSetsForExport } from "@/utils/axios/db_routes";
import type { EquippedItem } from "@/store/gear";
import type { DbGearSetExport, GearSlotType } from "@/domain/types";
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

export type EncodedGearSetExport = {
  name: string;
  tags: string[];
  code: string;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useGearSetExport(ctx: GearSetExportContext): {
  exportCode: () => Promise<string>;
  importCode: (code: string) => ImportResult;
  exportStoredGearSets: () => Promise<EncodedGearSetExport[]>;
} {
  const excluded = new Set<GearSlotType>(["consumable", "potion", "service"]);

  const toSlotName = (slotType: GearSlotType, slotIndex: number): string => {
    const indexedSlotTypes = new Set<GearSlotType>(["ring", "tool"]);
    if (indexedSlotTypes.has(slotType)) {
      return `${slotType}${slotIndex + 1}`;
    }
    return slotType;
  };

  const toEncodedEntry = (
    gearSet: DbGearSetExport,
    itemIdMap: Record<string, string>,
  ): EncodedGearSetExport => {
    const slots = gearSet.items
      .filter((item) => !excluded.has(item.slotType))
      .map((item) => {
        const slotName = toSlotName(item.slotType, item.slotIndex);
        return buildExportedSlot(
          slotName,
          { id: item.itemId, quality: item.quality },
          itemIdMap,
        );
      });

    return {
      name: gearSet.name,
      tags: gearSet.tags,
      code: encodeGearSet(slots),
    };
  };

  const exportCode = async (): Promise<string> => {
    const slotKeys = Object.keys(ctx.gearSlots.value).filter(
      (key) => !excluded.has(key as GearSlotType),
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

  const exportStoredGearSets = async (): Promise<EncodedGearSetExport[]> => {
    const gearSets = await getGearSetsForExport();

    const allItemIds = Array.from(
      new Set(
        gearSets.flatMap((gearSet) =>
          gearSet.items
            .filter((item) => !excluded.has(item.slotType))
            .map((item) => item.itemId),
        ),
      ),
    );

    const itemIdMap =
      allItemIds.length > 0 ? (await getOldItemIds(allItemIds)).data : {};

    return gearSets.map((gearSet) => toEncodedEntry(gearSet, itemIdMap));
  };

  return { exportCode, importCode, exportStoredGearSets };
}
