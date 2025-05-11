import { capitalize } from "@/utils/string.js";

export const misc_loot = {
  title: "Misc. Loot",
  key: "misc_loot",
  source: "loot",
  filter: null,
};

export const misc_crafted = {
  title: "Misc. Crafted",
  key: "misc_crafted",
  source: "crafted",
  filter: null,
};

export const crafted_categories = [
  { suffix: "hatchets", keyword: "woodcuttingHatchet" },
  { suffix: "pickaxes", keyword: "pickaxe" },
  { suffix: "sickles", keyword: "sickle" },
  { suffix: "fishing tools", keyword: "fishingTool" },
  { suffix: "diving gear", keyword: "itemset_diving_gear" },
  { suffix: "amulets", keyword: "item_amulet" },
  { suffix: "rings", keyword: "item_ring" },
  { suffix: "weapons", keyword: "weapon" },
  { suffix: "shields", keyword: "shield" },
].map(({ suffix, keyword }) => {
  return {
    title: `Crafted ${capitalize(suffix)}`,
    key: `crafted_${suffix}`,
    source: "crafted",
    filter: (item) => item.keywords.includes(keyword),
  };
});

export const resolveChestCategories = (loot, chestTables) => {
  const excludedForMultipleCheck = [
    "jarvonia chest table",
    "gdte chest table",
  ];
  const itemToTablesMap = {};
  const itemIdToTableNames = new Map();
  const multipleSourcesItems = new Set();
  const chestTableCategories = [];

  // Step 1: Build mapping of which item belongs to which chest
  for (const table of chestTables) {
    const tableName = table.name;
    for (const subTable of table.subTables || []) {
      for (const row of subTable.tableRows || []) {
        const itemId = row.rowItemID;

        if (!itemToTablesMap[itemId]) itemToTablesMap[itemId] = [];
        itemToTablesMap[itemId].push(tableName);
      }
    }
  }

  // Step 2: Identify multiple-source items (excluding Jarvonia and GDTE)
  for (const [itemId, tables] of Object.entries(itemToTablesMap)) {
    const nonExcludedTables = tables.filter(
      (t) => !excludedForMultipleCheck.includes(t)
    );
    if (nonExcludedTables.length > 1) {
      multipleSourcesItems.add(parseInt(itemId));
    }
  }

  // Step 3: Create chest categories
  for (const table of chestTables) {
    const isExcludedFromMulti = excludedForMultipleCheck.includes(table.name);
    const itemIds = new Set(
      table.subTables?.flatMap(
        (st) => st.tableRows?.map((r) => r.rowItemID) || []
      ) || []
    );

    let filteredItems = loot.filter((item) => itemIds.has(item.id));

    // If this is Jarvonia or GDTE, only include items that appear *only* in this chest
    if (isExcludedFromMulti) {
      filteredItems = filteredItems.filter((item) => {
        const tables = itemToTablesMap[item.id] || [];
        return tables.length === 1 && tables[0] === table.name;
      });
    } else {
      // Otherwise, remove multiple-source items
      filteredItems = filteredItems.filter(
        (item) => !multipleSourcesItems.has(item.id)
      );
    }

    if (filteredItems.length > 0) {
      chestTableCategories.push({
        title: `${capitalize(table.name.split(" ")[0])} chest`,
        key: `chest_${table.name.toLowerCase().replace(/\s+/g, "_")}`,
        source: "loot",
        filter: (item) => filteredItems.some((i) => i.id === item.id),
      });
    }
  }

  // Multiple chest sources category
  const multipleItems = loot.filter((item) =>
    multipleSourcesItems.has(item.id)
  );
  if (multipleItems.length > 0) {
    chestTableCategories.unshift({
      title: "Multiple Chest Sources",
      key: "chest_multiple",
      source: "loot",
      filter: (item) => multipleSourcesItems.has(item.id),
    });
  }

  return chestTableCategories;
};
