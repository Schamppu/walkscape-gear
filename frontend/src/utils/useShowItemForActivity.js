import { useActivityStore } from "@/store/activity";
import { useItemsStore } from "@/store/items";
import { useRequirements } from "@/utils/useRequirements";
import { getRawData } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";

export function useShowItemForActivity() {
  const activityStore = useActivityStore();
  const itemStore = useItemsStore();
  const { checkRequirements } = useRequirements();

  const usefulKeywords = (item, activity, service) => {
    if (!activity) return false;
    const kw = activity?.requiredKeywords || [];
    const requirements = activity?.requirements || [];
    const serviceRequirements = service?.requirements || [];

    const kws = kw?.map(({ keyword }) => keyword) ?? [];
    const kwEquipped =
      [...requirements, ...serviceRequirements]
        ?.filter((req) => req.type === "distinctKeywordItemsEquipped")
        .flatMap(({ requirement }) => requirement.keywords) ?? [];

    if (!(kws || kwEquipped)) return false;
    return item.keywords.filter(
      (keyword) => kws.includes(keyword) || kwEquipped.includes(keyword)
    );
  };

  const usefulAttrs = (item, activity, quality, isRecipe) => {
    const baseAttrs = sumAttrs(
      item.itemAttrs,
      item.itemQualityAttrs || [],
      item.buffs || [],
      quality
    );

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
      const recipeOnlyAttrs = ["No materials consumed"];
      return !recipeOnlyAttrs.includes(attr.statText);
    };

    const filterCO = (attr, activity) => {
      const statIsCO = attr.statText === "Crafting outcome";
      if (!statIsCO) return true;
      if (!isRecipe) return false;

      const benefitsCO = Object.keys(activity.itemRewards).some(
        (itemId) =>
          itemId in itemStore.allItems &&
          itemStore.allItems[itemId].type === "crafted"
      );

      return statIsCO && benefitsCO;
    };

    const unfilteredRequirementTypes = ["distinctKeywordItemsEquipped"];

    const usefulAttr = baseAttrs.filter((attr) => {
      const usedRequirements = attr.requirements.filter(
        (req) => !unfilteredRequirementTypes.includes(req.type)
      );

      return (
        filterActivityOnlyAttrs(attr) &&
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
    const currentActivity =
      activity ||
      (activityStore.activitySelected && activityStore.activity) ||
      (activityStore.recipeSelected && activityStore.recipe);

    const currentService =
      service || (activityStore.recipeSelected && activityStore.service);

    const currentQuality = quality || itemProxy.quality;

    const currentIsRecipe =
      isRecipe !== null ? isRecipe : activityStore.recipeSelected;

    if (!currentActivity) return false;

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
