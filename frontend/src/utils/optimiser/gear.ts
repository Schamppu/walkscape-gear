import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useRequirements } from "@/composables/useRequirements";
import { type LootTablesContext } from "@/composables/useLootTables";
import { type RequirementContext } from "@/composables/useRequirements";
import { usedAttrs } from "@/domain/quality/qualityAttrs";
import { gearTypes } from "@/domain/constants/gear";
import type { Stat } from "@/domain/types/item";
import type { ItemDetail } from "@/domain/types/item";
import type { LocationDetail } from "@/domain/types/location";
import type { Requirement } from "@/domain/types/common";

import { getReq, isHandledRequirement, contributesToReq } from "./requirements";
import type { HandledRequirement } from "./requirements";
import { getGearSetStats, filterUsefulStats } from "./stats";
import { getItemScores } from "./score";
import { priorityValue } from "./priority";
import type { MappedItem, OptimiserItem, GearSet, GearOptions, SlotOptions } from "./types";
import { intersect } from "@/utils/intersect";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** ItemDetail extended with an optional quality2, added for owned ring items. */
type QualityItem = ItemDetail & { quality2?: string | null };

/** Source object shape expected by filterDirectUpgrades. */
type FilterSource = { requirements: Requirement[] } | null;

/**
 * Minimal type expected by `showItemForActivity`, `usefulKeywords`, and
 * `usefulAbilities`. `ItemDetail.tables` is `unknown[]` which is not directly
 * assignable to the more-specific `LootTableRef[]` the composable declares, so
 * we cast through this alias when passing items to those functions.
 */
type DisplayableItem = { quality: string | null; [key: string]: unknown };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const mapItemToStats = (
  item: QualityItem,
  ctx: ReturnType<typeof useBaseContext>,
): MappedItem | MappedItem[] => {
  const { checkRequirements } = useRequirements(ctx as unknown as RequirementContext);

  const getAttrs = (
    it: QualityItem,
    quality: string,
  ): { stats: Stat[]; usefulStats: Stat[] } => {
    const attrs = usedAttrs(it as ItemDetail, quality);
    return {
      stats: attrs.flatMap(({ stats }) => stats[0]),
      usefulStats: attrs
        .filter(({ requirements }) =>
          checkRequirements(requirements, ctx as unknown as RequirementContext),
        )
        .flatMap(({ stats }) => stats[0]),
    };
  };

  const base: MappedItem = { ...item, ...getAttrs(item, item.quality) };

  if (item.gearType === "ring") {
    const owned = ctx.ownedItems.value[item.id];
    const q2 = owned?.quality2;
    return [
      base,
      {
        ...item,
        ...getAttrs(item, q2 ? q2 : item.quality),
      } as MappedItem,
    ];
  }

  return base;
};

const filterLocations = (locations: LocationDetail[]): LocationDetail[] => {
  const filtered = locations.reduce<{ locations: LocationDetail[]; seen: Record<string, boolean> }>(
    (acc, cur) => {
      const key = `${cur.faction}-${cur.keywords.join("-")}`;
      if (key in acc.seen) return acc;
      acc.seen[key] = true;
      acc.locations.push(cur);
      return acc;
    },
    { locations: [], seen: {} },
  );

  return filtered.locations;
};

const filterDirectUpgrades = (
  items: OptimiserItem[],
  source: FilterSource = null,
): OptimiserItem[] => {
  function normalizeStats(stats: Stat[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of stats) {
      map.set(`${s.type}-${s.isPercent}`, s.value);
    }
    return map;
  }

  function dominates(aStats: Map<string, number>, bStats: Map<string, number>): boolean {
    let strictlyBetter = false;

    if (bStats.size === 0) {
      return aStats.size > 0;
    }

    for (const [type, bValue] of bStats) {
      const aValue = aStats.get(type);
      if (aValue === undefined) return false;
      if (Math.abs(aValue) < Math.abs(bValue)) return false;
      if (Math.abs(aValue) > Math.abs(bValue)) strictlyBetter = true;
    }

    if (aStats.size > bStats.size) strictlyBetter = true;

    return strictlyBetter;
  }

  function sameKeywords(a: OptimiserItem, b: OptimiserItem): boolean {
    if (!source) return true;

    const reqs = source.requirements
      .filter(isHandledRequirement)
      .map((req) => getReq(req as HandledRequirement));

    reqs.every((req) => {
      if (contributesToReq(b, req)) {
        return contributesToReq(a, req);
      }
      return true;
    });

    return true;
  }

  type NormalizedItem = OptimiserItem & { _stats: Map<string, number> };

  const normalized: NormalizedItem[] = items.map((item) => ({
    ...item,
    _stats: normalizeStats(item.usefulStats),
  }));

  return normalized
    .filter(
      (item, i) =>
        !normalized.some(
          (other, j) =>
            i !== j &&
            dominates(other._stats, item._stats) &&
            (!source || sameKeywords(other, item)),
        ),
    )
    .map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _stats, ...item }) => item,
    );
};

// ---------------------------------------------------------------------------
// Exported utilities
// ---------------------------------------------------------------------------

export const filterMultislot = (
  gearSet: GearSet,
  opts: OptimiserItem[],
  slotKey: string,
  slotName: string,
): OptimiserItem[] => {
  const dataStore = useDataStore();

  const previousSlots = Object.entries(gearSet)
    .filter(([slot]) => slot.includes(slotKey))
    .map(([, item]): number => {
      if (!item || !("quality" in item)) return -1;
      const gearItem = item as OptimiserItem;
      return opts.findIndex(
        (opt) => opt.id === gearItem.id && opt.quality === gearItem.quality,
      );
    });

  const filterBannedKeywords = (item: OptimiserItem): boolean => {
    const otherSlotsItems = Object.entries(gearSet)
      .filter(
        ([slot, slotItem]) =>
          slotItem && slot !== slotName && slot.includes(slotKey),
      )
      .map(([, slotItem]) => slotItem as OptimiserItem);
    const equippedKeywords = otherSlotsItems.flatMap((si) => si.keywords);
    const bannedKeywords = equippedKeywords.flatMap(
      (keyword) => dataStore.keywordsMap[keyword]?.bannedKeywords ?? [],
    );
    const commonKeywords = intersect(item.keywords, bannedKeywords);
    return commonKeywords.length === 0;
  };

  return opts.filter((item, index) => {
    return !previousSlots.includes(index) && filterBannedKeywords(item);
  });
};

export const getGearOptions = (): GearOptions => {
  const activityStore = useActivityStore();
  const baseCtx = useBaseContext();
  const { showItemForActivity, usefulKeywords, usefulAbilities } =
    useShowItemForActivity(baseCtx as unknown as LootTablesContext);

  const filterOwned = (item: ItemDetail): boolean =>
    item.id in baseCtx.ownedItems.value;

  const filterItems = (items: QualityItem[]): QualityItem[] =>
    items.filter(
      (item) => filterOwned(item) && showItemForActivity(item as unknown as DisplayableItem),
    );

  const baseScore = getGearSetStats({});

  /**
   * The activity value's `ActivityNone` variant has `requirements: unknown`,
   * which doesn't satisfy the composable's `SourceLike`. Cast through a
   * compatible structural type that holds all the fields we actually need.
   */
  type ActivitySourceCompat = {
    name: string;
    keywords: string[];
    requirements: Requirement[];
    relatedSkillsList?: string[];
  };
  const activitySource = baseCtx.activity.value as unknown as ActivitySourceCompat | null;

  const itemsBySlot = Object.fromEntries(
    gearTypes.map((slot) => {
      if (slot === "location" && activityStore.locations) {
        return [
          slot,
          {
            required: [] as OptimiserItem[],
            primary: filterLocations(activityStore.locations),
          } satisfies SlotOptions,
        ];
      }

      const items = Object.values(baseCtx.allGearItems.value).filter((item) => {
        const it = item as ItemDetail & { egg?: unknown };
        return it.gearType === slot || it.type === slot || (slot === "pet" && it.egg);
      });

      const qualityItems: QualityItem[] = items.map((item) => {
        if (
          (!["crafted", "consumable"].includes(item.type) && slot !== "pet") ||
          !(item.id in baseCtx.ownedItems.value)
        ) {
          return item;
        }
        const owned = baseCtx.ownedItems.value[item.id];
        return { ...item, quality: owned.quality ?? item.quality, quality2: owned.quality2 };
      });

      const filteredItems = filterItems(qualityItems);
      const mappedItems: MappedItem[] = filteredItems.flatMap((item) =>
        mapItemToStats(item, baseCtx),
      );
      const scoredItems: OptimiserItem[] = getItemScores(slot, mappedItems, baseScore);

      const keywordItems = scoredItems.filter(
        (item) =>
          usefulKeywords(
            item as unknown as DisplayableItem,
            activitySource!,
            null,
          ).length > 0,
      );
      const abilityItems = scoredItems.filter((item) => {
        const abilities = usefulAbilities(
          item as unknown as DisplayableItem,
          activitySource,
        );
        return Array.isArray(abilities) && abilities.length > 0;
      });

      const upgradeFiltered = ["ring"].includes(slot)
        ? scoredItems
        : filterDirectUpgrades(scoredItems);
      const statFiltered = filterUsefulStats(upgradeFiltered, priorityValue());

      return [
        slot,
        {
          required:
            filterDirectUpgrades(
              keywordItems,
              baseCtx.source.value as FilterSource,
            ).concat(abilityItems) ?? [],
          primary: statFiltered ?? [],
        } satisfies SlotOptions,
      ];
    }),
  ) as GearOptions;

  return itemsBySlot;
};

export function getItemOptions(
  options: GearOptions,
  key: "required",
): Record<string, OptimiserItem[]>;
export function getItemOptions(
  options: GearOptions,
  key: "primary",
): Record<string, SlotOptions["primary"]>;
export function getItemOptions(
  options: GearOptions,
  key: keyof SlotOptions,
): Record<string, SlotOptions[keyof SlotOptions]> {
  return Object.fromEntries(
    Object.entries(options).map(([slot, items]) => [slot, items[key]]),
  );
}

export { slotMax } from "./slots";
