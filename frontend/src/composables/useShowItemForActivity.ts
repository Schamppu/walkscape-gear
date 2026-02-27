import { useRequirements, type RequirementContext } from "@/composables/useRequirements";
import { getRawData } from "@/utils/rawData";
import { usedAttrs, type Attribute } from "@/domain/quality/qualityAttrs";
import { useLootTables, type LootTablesContext } from "./useLootTables";
import {
  filterUsefulAbilities,
  filterUsefulKeywords,
  filterUsefulAttrs,
  type SourceForItem,
} from "@/domain/gear/itemActivity";
import type { Requirement } from "@/domain/types/common";
import type { LootTableRef } from "@/domain/types/common";
import type { LevelBonusGearItem } from "@/composables/useLevelBonus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal item shape used by the display helpers. */
type ItemForDisplay = {
  abilities?: (string | { ability: string; unlockLevel: string })[];
  keywords?: string[];
  tables?: LootTableRef[];
  quality: string | null;
  [key: string]: unknown;
};

/**
 * Minimal activity/recipe shape consumed by the display helpers.
 * Both `ActivityDetail` and `RecipeDetail` satisfy this at runtime.
 */
type SourceLike = SourceForItem & {
  name: string;
  relatedSkillsList?: string[];
  relatedSkills?: string[];
};

type ServiceLike = {
  requirements: Requirement[];
} | null;

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useShowItemForActivity(ctx: LootTablesContext): {
  showItemForActivity: (
    itemProxy: ItemForDisplay,
    source?: SourceLike | null,
    service?: ServiceLike,
    quality?: string | null,
    isRecipe?: boolean | null,
  ) => boolean;
  usefulKeywords: (
    item: ItemForDisplay,
    source: SourceLike,
    service: ServiceLike,
  ) => boolean[];
  usefulAbilities: (
    item: ItemForDisplay,
    source: SourceLike | null,
  ) => string[] | false;
  usefulAttrs: (
    item: ItemForDisplay,
    source: SourceLike,
    quality: string | null,
    isRecipe: boolean | null,
  ) => Attribute[];
  itemTables: (item: ItemForDisplay) => LootTableRef[];
} {
  const { checkRequirements } = useRequirements(ctx as unknown as RequirementContext);
  const { hasCollectibleDrops, hasFineDrops } = useLootTables(ctx);

  const usefulAbilities = (
    item: ItemForDisplay,
    source: SourceLike | null,
  ): string[] | false => {
    if (!source || !item.abilities) return false;
    return filterUsefulAbilities(item, source);
  };

  const usefulKeywords = (
    item: ItemForDisplay,
    source: SourceLike,
    service: ServiceLike,
  ): boolean[] => {
    if (!source || !item.keywords) return [];

    const travelReqs: Requirement[] =
      source.name === "Travelling"
        ? (ctx.segments.value as unknown as { requirements: Requirement[] }[]).flatMap(
            ({ requirements }) => requirements,
          )
        : [];

    const allRequirements = [
      ...source?.requirements ?? [],
      ...(service?.requirements ?? []),
      ...travelReqs,
    ];

    return filterUsefulKeywords(item, allRequirements);
  };

  const usefulAttrs = (
    item: ItemForDisplay,
    source: SourceLike,
    quality: string | null,
    isRecipe: boolean | null,
  ): Attribute[] => {
    const attrs = usedAttrs(item as unknown as Parameters<typeof usedAttrs>[0], quality ?? "common");

    const craftedRewardItemIds = Object.keys(source.itemRewards ?? {}).filter(
      (id) =>
        id in ctx.allGearItems.value &&
        (ctx.allGearItems.value[id] as LevelBonusGearItem).type === "crafted",
    );

    return filterUsefulAttrs(attrs, {
      isRecipe: isRecipe ?? false,
      hasCollectibleDrops: hasCollectibleDrops.value,
      hasFineDrops: hasFineDrops.value,
      craftedRewardItemIds,
      checkRequirements,
    });
  };

  const itemTables = (item: ItemForDisplay): LootTableRef[] =>
    (item.tables as LootTableRef[]) || [];

  const showItemForActivity = (
    itemProxy: ItemForDisplay,
    source: SourceLike | null = null,
    service: ServiceLike = null,
    quality: string | null = null,
    isRecipe: boolean | null = null,
  ): boolean => {
    const currentSource = (source || ctx.source.value) as SourceLike | null;
    const currentService = service || ctx.service.value;
    const currentQuality = quality || itemProxy.quality;
    const currentIsRecipe = isRecipe !== null ? isRecipe : ctx.recipeSelected.value;

    if (!ctx.source.value || !currentSource) return false;

    const item = getRawData(itemProxy);

    const [skill] = currentSource.relatedSkillsList ??
      currentSource.relatedSkills ?? [null];
    if (!skill) return true;

    const hasUsefulKeywords =
      usefulKeywords(item, currentSource, currentService).length > 0;
    const abilities = usefulAbilities(item, currentSource);
    const hasUsefulAbility = abilities !== false && abilities.length > 0;
    const hasUsefulAttrs = usefulAttrs(item, currentSource, currentQuality, currentIsRecipe).length > 0;
    const hasTables = itemTables(item).length > 0;

    return hasUsefulKeywords || hasUsefulAttrs || hasUsefulAbility || hasTables;
  };

  return {
    showItemForActivity,
    usefulKeywords,
    usefulAbilities,
    usefulAttrs,
    itemTables,
  };
}
