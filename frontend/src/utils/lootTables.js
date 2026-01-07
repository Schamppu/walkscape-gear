import { usedAttrs } from "./qualityAttrs";
import { usePlayerStore } from "@/store/player";
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
  if (!source) return [];

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
  return [...getSourceLootTables(ctx), ...getGearLootTables(ctx)];
};

const resolveWeight = (params) => {
  const playerStore = usePlayerStore();
  const { rowWeight, minWeightScale, requirementsBonuses } = params;
  const { levelMaxScaling, levelRequirement, relatedSkill } =
    requirementsBonuses[0];
  const level = playerStore.skillLevels[relatedSkill] || 1;
  if (level < levelRequirement) {
    return 0;
  } else if (level >= levelMaxScaling) {
    return rowWeight;
  } else if (
    rowWeight / (levelMaxScaling - levelRequirement + 1) < 1 &&
    level == levelRequirement
  ) {
    return Math.floor(rowWeight * minWeightScale * 10 + 0.5) / 10;
  } else {
    const weightIncrement =
      rowWeight / (levelMaxScaling - levelRequirement + 1);
    const weight = weightIncrement * (level - (levelRequirement - 1));
    return Math.floor(weight * 10 + 0.5) / 10;
  }
};

const resolveLootTableWeights = (tables) => {
  const tableRows = tables.map((table) =>
    table.tableRows.map((row) => {
      const { rowWeight, minWeightScale, requirementsBonuses } = row;
      return {
        ...row,
        rowWeight: requirementsBonuses?.length
          ? resolveWeight({ rowWeight, minWeightScale, requirementsBonuses })
          : rowWeight,
      };
    })
  );
  return tables.map((table, index) => {
    return {
      ...table,
      tableRows: tableRows[index],
    };
  });
};

export const normalizeLootTable = (table) => {
  return resolveLootTableWeights(table);
};

export const mapTableToItems = (table) => {
  const { rollAmount, rollChance, slot, type, tableSource, stat } = table;
  return table.tables?.flatMap(({ noDropChance, tableRows }) => {
    const mappedRows = tableRows.map((row) => {
      return {
        ...row,
        noDropChance,
      };
    });
    const tableWeight = mappedRows.reduce((acc, row) => {
      return acc + (row.rowWeight || 0);
    }, 0);
    return mappedRows.map((row) => {
      return {
        ...row,
        tableWeight,
        rollAmount,
        slot,
        stat,
        type,
        tableSource,
        rollChance,
      };
    });
  });
};
