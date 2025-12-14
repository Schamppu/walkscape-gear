import { storeToRefs } from "pinia";
import { useDataStore } from "@/store/data";
import { useRequirements } from "@/composables/useRequirements";
import { useSettingsStore } from "@/store/settings";
import { getRawData } from "@/utils/rawData";
import { sumAttrs } from "@/utils/qualityAttrs";

export function useShowItemForActivity(ctx) {
  const dataStore = useDataStore();
  const settingsStore = useSettingsStore();
  const { activitySettings } = storeToRefs(settingsStore);
  const { checkRequirements } = useRequirements(ctx);

  const usefulKeywords = (item, activity, service) => {
    if (!activity) return false;
    const kw = activity?.requiredKeywords || [];
    const requirements = activity?.requirements || [];
    const serviceRequirements = service?.requirements || [];

    const kws = kw?.map(({ id }) => id) ?? [];
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

    const hideOwnedCollectibles =
      activitySettings.value.hideOwnedCollectibles.value;

    const activityCollectibles =
      activity.tables !== null
        ? activity.tables
            .filter(({ type }) => type.includes("collectible"))
            .flatMap(({ tables }) => tables)
            .map((table) => {
              const tableData = dataStore.detailedLootTablesMap[table];
              if (tableData.tableRows.length === 0) return false;
              return tableData.tableRows[0].rowItemID;
            })
            .filter(Boolean)
            .filter(
              (collectible) =>
                !hideOwnedCollectibles ||
                (hideOwnedCollectibles &&
                  !(collectible in ctx.ownedItems.value))
            )
        : [];

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
      const recipeOnlyAttrs = ["No materials consumed", "Crafting outcome"];
      return !recipeOnlyAttrs.includes(attr.statText);
    };

    const filterCO = (attr, activity) => {
      const statIsCO = attr.statText === "Crafting outcome";
      if (!statIsCO) return true;
      if (!isRecipe) return false;

      const benefitsCO = Object.keys(activity.itemRewards).some(
        (itemId) =>
          itemId in ctx.allItems.value &&
          ctx.allItems.value[itemId].type === "crafted"
      );

      return statIsCO && benefitsCO;
    };

    const filterFindCollectibles = (attr, activityCollectibles) => {
      const statIsFindCollectibles = attr.statText === "Find collectibles";
      if (!statIsFindCollectibles) return true;
      return activityCollectibles.length > 0;
    };

    const unfilteredRequirementTypes = ["distinctKeywordItemsEquipped"];

    const usefulAttr = baseAttrs.filter((attr) => {
      const usedRequirements =
        attr?.requirements?.filter(
          (req) => !unfilteredRequirementTypes.includes(req.type)
        ) || [];

      return (
        filterActivityOnlyAttrs(attr) &&
        filterFindCollectibles(attr, activityCollectibles) &&
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
