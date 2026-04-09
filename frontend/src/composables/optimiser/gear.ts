import { useActivityStore } from "@/store/activity";
import { useDataStore } from "@/store/data";
import { useSettingsStore } from "@/store/settings";
import useBaseContext from "@/composables/context/useBaseContext";
import { useShowItemForActivity } from "@/composables/useShowItemForActivity";
import { useRequirements } from "@/composables/useRequirements";
import { type LootTablesContext } from "@/composables/useLootTables";
import { type RequirementContext } from "@/composables/useRequirements";
import { usedAttrs } from "@/domain/quality/qualityAttrs";
import { gearTypes } from "@/domain/constants/gear";
import { filterLocations, filterDirectUpgrades } from "@/domain/optimiser/gear";
import { getLevelRequirementsMap } from "@/domain/requirements/requirementUtils";
import type { Stat } from "@/domain/types/item";
import type { ItemDetail } from "@/domain/types/item";
import type { Requirement } from "@/domain/types/common";

import { getGearSetStats } from "./stats";
import { filterUsefulStats } from "@/domain/optimiser/scoring";
import { getItemScores } from "./score";
import { priorityValue } from "./priority";
import type {
  MappedItem,
  OptimiserItem,
  GearSet,
  GearOptions,
  SlotOptions,
} from "@/domain/optimiser/types";
import { intersect } from "@/utils/intersect";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Minimal shape expected by `usefulKeywords` for the service parameter. */
type ServiceLike = { requirements: Requirement[] } | null;

/** ItemDetail extended with an optional quality2, added for owned ring items. */
type QualityItem = ItemDetail & { quality2?: string | null };

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
  const { checkRequirements } = useRequirements(
    ctx as unknown as RequirementContext,
  );

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

  const levelMap = getLevelRequirementsMap(item.requirements);
  const levelValues = Object.values(levelMap);
  const level = levelValues.length > 0 ? Math.max(...levelValues) : 1;

  const base: MappedItem = { ...item, ...getAttrs(item, item.quality), level };

  if (item.gearType === "ring") {
    const owned = ctx.ownedItems.value[item.id];
    const q2 = owned?.craftedTier2;
    const quantity = owned?.quantity ?? 0;

    // Only produce a second entry if the player owns 2+ of this ring
    if (quantity < 2) return base;

    return [
      base,
      {
        ...item,
        ...getAttrs(item, q2 ? q2 : item.quality),
        level,
      } as MappedItem,
    ];
  }

  return base;
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

// ---------------------------------------------------------------------------
// Module-level types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal shared context
// ---------------------------------------------------------------------------

/** Shared setup called once per public gear-options function. */
const makeGearCtx = () => {
  const activityStore = useActivityStore();
  const settingsStore = useSettingsStore();
  const baseCtx = useBaseContext();
  const { canBeEquipped } = useRequirements(
    baseCtx as unknown as RequirementContext,
  );
  const { showItemForActivity, usefulKeywords, usefulAbilities } =
    useShowItemForActivity(baseCtx as unknown as LootTablesContext);

  const baseScore = getGearSetStats({});
  const activitySource = baseCtx.source
    .value as unknown as ActivitySourceCompat | null;

  const filterOwned = (item: ItemDetail): boolean =>
    item.id in baseCtx.ownedItems.value;

  const hideUnmetRequirements =
    settingsStore.gearSettings.showUnmetRequirements?.value === false;

  const itemPassesRequirements = (item: ItemDetail): boolean =>
    !hideUnmetRequirements || canBeEquipped(item);

  const filterItems = (items: QualityItem[]): QualityItem[] =>
    items.filter(
      (item) =>
        filterOwned(item) &&
        itemPassesRequirements(item) &&
        showItemForActivity(item as unknown as DisplayableItem),
    );

  /** Items the player owns but that don't match the current activity. */
  const filterOwnedOnly = (items: QualityItem[]): QualityItem[] =>
    items.filter(
      (item) =>
        filterOwned(item) &&
        itemPassesRequirements(item) &&
        !showItemForActivity(item as unknown as DisplayableItem),
    );

  return {
    activityStore,
    baseCtx,
    usefulKeywords,
    usefulAbilities,
    baseScore,
    activitySource,
    serviceSource: activityStore.service as ServiceLike | null,
    filterItems,
    filterOwnedOnly,
  };
};

type GearCtx = ReturnType<typeof makeGearCtx>;

// ---------------------------------------------------------------------------
// Internal per-slot item building
// ---------------------------------------------------------------------------

/**
 * Builds the quality-adjusted item list and scored items for a single slot.
 * Returns both so that callers can use `qualityItems` for the owned-only
 * fallback pipeline without repeating the quality-mapping step.
 */
const getScoredItemsForSlot = (
  slot: string,
  ctx: GearCtx,
): { qualityItems: QualityItem[]; scoredItems: OptimiserItem[] } => {
  const { baseCtx, filterItems, baseScore } = ctx;

  const items = Object.values(baseCtx.allGearItems.value).filter((item) => {
    const it = item as ItemDetail & { egg?: unknown };
    return (
      it.gearType === slot || it.type === slot || (slot === "pet" && it.egg)
    );
  });

  const qualityItems: QualityItem[] = items.map((item) => {
    if (!(item.id in baseCtx.ownedItems.value)) {
      return item;
    }
    const owned = baseCtx.ownedItems.value[item.id];

    if (item.type === "crafted") {
      return {
        ...item,
        quality: owned.craftedTier ?? item.quality,
        quality2: owned.craftedTier2,
      };
    }
    if (item.type === "consumable") {
      const quality = owned.consumableFine
        ? "consumableFine"
        : owned.consumableCommon
          ? "consumableCommon"
          : item.quality;
      return { ...item, quality };
    }
    if (slot === "pet") {
      return {
        ...item,
        quality: String(owned.petLevel ?? 0),
      };
    }
    return item;
  });

  const filteredItems = filterItems(qualityItems);
  const mappedItems: MappedItem[] = filteredItems.flatMap((item) =>
    mapItemToStats(item, baseCtx),
  );
  const scoredItems: OptimiserItem[] = getItemScores(
    slot,
    mappedItems,
    baseScore,
  );

  return { qualityItems, scoredItems };
};

/**
 * Returns true when tool items `a` and `b` are mutually exclusive — i.e. at
 * least one of them carries a keyword whose `bannedKeywords` list includes a
 * keyword the other item has.  Only mutually exclusive tools compete for the
 * same effective slot, so only they should be compared for stat dominance.
 */
const areMutuallyExclusiveTools = (
  a: OptimiserItem,
  b: OptimiserItem,
  keywordsMap: Record<string, { bannedKeywords: string[] }>,
): boolean => {
  if (!a.keywords || !b.keywords) return false;
  for (const kw of a.keywords) {
    const banned = keywordsMap[kw]?.bannedKeywords ?? [];
    if (b.keywords.some((k) => banned.includes(k))) return true;
  }
  for (const kw of b.keywords) {
    const banned = keywordsMap[kw]?.bannedKeywords ?? [];
    if (a.keywords.some((k) => banned.includes(k))) return true;
  }
  return false;
};

const upgradeFilteredForSlot = (
  slot: string,
  scoredItems: OptimiserItem[],
): OptimiserItem[] => {
  if (slot === "ring") return scoredItems;
  if (slot === "tool") {
    const { keywordsMap } = useDataStore();
    return filterDirectUpgrades(scoredItems, (a, b) =>
      areMutuallyExclusiveTools(a, b, keywordsMap),
    );
  }
  return filterDirectUpgrades(scoredItems);
};

// ---------------------------------------------------------------------------
// Public gear-option generators (called lazily, one phase at a time)
// ---------------------------------------------------------------------------

/**
 * Phase 1 — Required options.
 * Generates items that match the activity via keywords or abilities for all
 * slots. Run this first, before requirements-fill, so the slot set is complete.
 */
export const getRequiredGearOptions = (): GearOptions => {
  const ctx = makeGearCtx();
  const { activitySource, serviceSource, usefulKeywords, usefulAbilities } =
    ctx;

  return Object.fromEntries(
    gearTypes.map((slot): [string, SlotOptions] => {
      if (slot === "location") {
        return [slot, { required: [], primary: [], fallback: [] }];
      }

      const { scoredItems } = getScoredItemsForSlot(slot, ctx);

      const keywordItems = scoredItems.filter(
        (item) =>
          usefulKeywords(
            item as unknown as DisplayableItem,
            activitySource!,
            serviceSource,
          ).length > 0,
      );
      const abilityItems = scoredItems.filter((item) => {
        const abilities = usefulAbilities(
          item as unknown as DisplayableItem,
          activitySource,
        );
        return Array.isArray(abilities) && abilities.length > 0;
      });

      return [
        slot,
        {
          required: filterDirectUpgrades(keywordItems).concat(abilityItems),
          primary: [],
          fallback: [],
        },
      ];
    }),
  ) as GearOptions;
};

/**
 * Phase 2 — Primary options.
 * Generates items that improve the selected target priority, but only for
 * `emptySlotKeys` — slots not already filled by the requirements phase.
 * Location is always included so `gearFill` can cycle through location options.
 */
export const getPrimaryGearOptions = (
  emptySlotKeys: Set<string>,
): GearOptions => {
  const ctx = makeGearCtx();
  const { activityStore } = ctx;

  return Object.fromEntries(
    gearTypes
      .filter((slot) => slot === "location" || emptySlotKeys.has(slot))
      .map((slot): [string, SlotOptions] => {
        if (slot === "location") {
          return [
            slot,
            {
              required: [],
              primary: activityStore.locations
                ? filterLocations(activityStore.locations)
                : [],
              fallback: [],
            },
          ];
        }

        const { scoredItems } = getScoredItemsForSlot(slot, ctx);
        const upgradeFiltered = upgradeFilteredForSlot(slot, scoredItems);
        const statFiltered = filterUsefulStats(
          upgradeFiltered,
          priorityValue(),
        );

        return [slot, { required: [], primary: statFiltered, fallback: [] }];
      }),
  ) as GearOptions;
};

/**
 * Phase 3 — Fallback options.
 * Only called for `emptySlotKeys` — slots still empty after the primary phase.
 * Tier 1: items that passed `showItemForActivity` + `filterDirectUpgrades` but
 *         were cut by `filterUsefulStats` (not relevant to the current target).
 * Tier 2: owned items that `showItemForActivity` excluded entirely but still
 *         have some stats after `filterDirectUpgrades`.
 */
export const getFallbackGearOptions = (
  emptySlotKeys: Set<string>,
): GearOptions => {
  const ctx = makeGearCtx();
  const { baseCtx, filterOwnedOnly, baseScore } = ctx;

  return Object.fromEntries(
    gearTypes
      .filter((slot) => slot !== "location" && emptySlotKeys.has(slot))
      .map((slot): [string, SlotOptions] => {
        const { qualityItems, scoredItems } = getScoredItemsForSlot(slot, ctx);
        const upgradeFiltered = upgradeFilteredForSlot(slot, scoredItems);

        // Tier 2: items excluded by showItemForActivity.
        const ownedOnlyItems = filterOwnedOnly(qualityItems);
        const ownedOnlyMapped: MappedItem[] = ownedOnlyItems.flatMap((item) =>
          mapItemToStats(item, baseCtx),
        );
        const ownedOnlyScored: OptimiserItem[] = getItemScores(
          slot,
          ownedOnlyMapped,
          baseScore,
        );
        const ownedOnlyUpgradeFiltered = upgradeFilteredForSlot(
          slot,
          ownedOnlyScored,
        );

        return [
          slot,
          {
            required: [],
            primary: [],
            fallback: upgradeFiltered.concat(ownedOnlyUpgradeFiltered),
          },
        ];
      }),
  ) as GearOptions;
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
