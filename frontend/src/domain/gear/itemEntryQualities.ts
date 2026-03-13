import type { ItemDetail } from "@/domain/types";

type ItemEntryQualitySource = Pick<ItemDetail, "type" | "gearType">;

export function getItemEntryQualities(item: ItemEntryQualitySource): 0 | 1 | 2 {
  if (item.type !== "crafted") return 0;
  if (item.gearType === "ring") return 2;
  return 1;
}
