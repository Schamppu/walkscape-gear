import { usedAttrs } from "./qualityAttrs";
import { useDataStore } from "@/store/data";
import { useRequirements } from "@/composables/useRequirements";
import { stripHtmlTags } from "@/utils/stripHtmlTags";

const getGearLootTables = (ctx) => {
  const { checkRequirements } = useRequirements(ctx);
  return ctx.filledGearSlots.value.flatMap(([slot, item]) => {
    const attrs = usedAttrs(item, item.quality)
      .filter(
        (item) =>
          Array.isArray(item.tables) &&
          item.tables.length > 0 &&
          checkRequirements(item.requirements)
      )
      .flatMap((item) => {
        const { tables, stats, customText } = item;
        return tables.map((table) => {
          return {
            ...table,
            tableSource: stripHtmlTags(item.customText) || item.name,
            slot,
            stat: customText,
            rollChance: stats?.[0]?.value || 1,
          };
        });
      });
    return attrs;
  });
};

const getSourceLootTables = (ctx) => {
  const source = ctx.source.value;
  const { tables: activityTables, name } = source;
  return (
    activityTables?.map((table) => {
      return {
        ...table,
        tableSource: `activity-${name}`,
      };
    }) || []
  );
};

export const getCtxLootTables = (ctx) => {
  return [...getGearLootTables(ctx), ...getSourceLootTables(ctx)];
};

export const normalizeLootTable = (table) => {
  console.log(table);
};
