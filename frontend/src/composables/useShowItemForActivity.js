import { useRequirements } from "@/composables/useRequirements";
import { getRawData } from "@/utils/rawData";
import { usedAttrs } from "@/utils/qualityAttrs";
import { useLootTables } from "./useLootTables";

export function useShowItemForActivity(ctx) {
  const { checkRequirements } = useRequirements(ctx);
  const { hasCollectibleDrops, hasFineDrops } = useLootTables(ctx);

  const usefulKeywords = (item, activity, service) => {
    if (!activity || !item.keywords) return false;
    const kwReqs = activity.requirements || [];
    const serviceRequirements = service?.requirements || [];

    const matchingKeywordRequirements = [...kwReqs, ...serviceRequirements]
      .filter(({ type }) => type.toLowerCase().includes("keyword"))
      .map(({ requirement }) => {
        return "keyword" in requirement
          ? item.keywords.includes(requirement["keyword"])
          : requirement["keywords"].some((kw) => item.keywords.includes(kw));
      });
    return matchingKeywordRequirements.filter((value) => value);
  };

  const usefulAttrs = (item, activity, quality, isRecipe) => {
    const baseAttrs = usedAttrs(item, quality);

    const filterActivityOnlyAttrs = (attr) => {
      if (!isRecipe) return true;
      const activityOnlyAttrs = [
        "Fine material finding",
        "Find gems",
        "Find bird nests",
        "Find collectibles",
      ];
      return !activityOnlyAttrs.includes(attr.statText);
    };

    const filterRecipeOnlyAttrs = (attr) => {
      if (isRecipe) return true;
      const recipeOnlyAttrs = ["No materials consumed", "Quality outcome"];
      return !recipeOnlyAttrs.includes(attr.statText);
    };

    const filterCO = (attr, activity) => {
      const statIsCO = attr.statText === "Quality outcome";
      if (!statIsCO) return true;
      if (!isRecipe) return false;

      const benefitsCO = Object.keys(activity.itemRewards).some(
        (itemId) =>
          itemId in ctx.allGearItems.value &&
          ctx.allGearItems.value[itemId].type === "crafted"
      );

      return statIsCO && benefitsCO;
    };

    const filterFindCollectibles = (attr) => {
      const statIsFindCollectibles = attr.statText === "Find collectibles";
      if (!statIsFindCollectibles) return true;
      return hasCollectibleDrops.value;
    };

    const filterFineMaterialFinding = (attr) => {
      const statIsFineMaterialFinding =
        attr.statText === "Fine material finding";
      if (!statIsFineMaterialFinding) return true;
      return hasFineDrops.value;
    };

    const unfilteredRequirementTypes = ["distinctKeywordItemsEquipped"];

    const usefulAttr = baseAttrs.filter((attr) => {
      const usedRequirements =
        attr?.requirements?.filter(
          (req) => !unfilteredRequirementTypes.includes(req.type)
        ) || [];

      return (
        filterActivityOnlyAttrs(attr) &&
        filterFindCollectibles(attr) &&
        filterFineMaterialFinding(attr) &&
        filterRecipeOnlyAttrs(attr) &&
        filterCO(attr, activity) &&
        checkRequirements(usedRequirements) &&
        attr.stats.some((stat) => !stat.isNegative)
      );
    });
    return usefulAttr;
  };

  const itemTables = (item) => {
    return item.tables || [];
  };

  const showItemForActivity = (
    itemProxy,
    activity = null,
    service = null,
    quality = null,
    isRecipe = null
  ) => {
    // Use store state if parameters are not provided
    const currentActivity = activity || ctx.source.value;

    const currentService = service || ctx.service.value;

    const currentQuality = quality || itemProxy.quality;

    const currentIsRecipe =
      isRecipe !== null ? isRecipe : ctx.recipeSelected.value;

    if (!ctx.source.value) return false;

    const item = getRawData(itemProxy);

    const [skill] = currentActivity.relatedSkillsList ??
      currentActivity.relatedSkills ?? [null];
    if (!skill) return true;

    const hasUsefulKeywords =
      usefulKeywords(item, currentActivity, currentService).length > 0;
    const usefulAttributes = usefulAttrs(
      item,
      currentActivity,
      currentQuality,
      currentIsRecipe
    );
    const hasUsefulAttrs = usefulAttributes.length > 0;
    const hasTables = itemTables(item).length > 0;
    return hasUsefulKeywords || hasUsefulAttrs || hasTables;
  };

  return {
    showItemForActivity,
    usefulKeywords,
    usefulAttrs,
    itemTables,
  };
}
