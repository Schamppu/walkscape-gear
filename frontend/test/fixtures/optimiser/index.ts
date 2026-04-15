import type { OptimiserItem } from "@/domain/optimiser/types";
import type { LocationDetail } from "@/domain/types/location";
import type { Stat } from "@/domain/types/item";

/** Builds a minimal OptimiserItem with the given stats and score. */
export function makeOptimiserItem(
  id: string,
  stats: Partial<Stat>[] = [],
  overrides: Partial<OptimiserItem> = {},
): OptimiserItem {
  const fullStats: Stat[] = stats.map((s) => ({
    stat: "work_efficiency",
    name: "Work Efficiency",
    type: "workEfficiency",
    isPercent: true,
    isNegative: false,
    isMultiplicative: true,
    value: 0,
    ...s,
  }));
  return {
    id,
    name: id,
    quality: "common",
    requirements: [],
    stats: fullStats,
    usefulStats: fullStats.filter((s) => !s.isNegative),
    score: 0,
    keywords: [],
    ...overrides,
  } as unknown as OptimiserItem;
}

/** Builds a minimal LocationDetail with the given faction and keywords. */
export function makeLocation(
  id: string,
  faction: string,
  keywords: string[] = [],
): LocationDetail {
  return { id, faction, keywords } as unknown as LocationDetail;
}
