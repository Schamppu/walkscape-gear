import { capitalize } from "./string.js";

export function categorizeItems({
  collectibles,
  crafted,
  loot,
  chestItems,
  itemRewards,
  achievementRewardItems,
  activityItems,
  shopItems,
}) {
  const categoryGroups = [
    {
      title: "Collectibles",
      categories: [
        {
          title: "All collectibles",
          key: "collectibles",
          items: collectibles,
        },
      ],
    },
  ];

  const activityCategory = resolveActivityCategory(loot, activityItems);
  const rewardCategories = resolveRewardsCategories(loot, itemRewards);
  const achivementRewardCategory = resolveAchievementRewardCategory(
    loot,
    achievementRewardItems
  );

  const { chestCategories, chestItemsList } = resolveChestCategories(
    loot,
    chestItems
  );

  const shopsCategory = resolveShopsCategory(loot, shopItems, chestItemsList);
  const lootAndRewardsCategories = [
    ...rewardCategories,
    achivementRewardCategory,
    shopsCategory,
    activityCategory,
  ];

  const miscLootItems = resolveMiscItems(loot, [
    ...lootAndRewardsCategories,
    ...chestCategories,
  ]);
  if (miscLootItems.length) {
    lootAndRewardsCategories.push({
      title: "Misc. Loot",
      key: "misc_loot",
      items: miscLootItems,
    });
  }

  categoryGroups.push({
    title: "Loot and Rewards",
    categories: lootAndRewardsCategories,
  });
  categoryGroups.push({ title: "Chests", categories: chestCategories });
  categoryGroups.push({
    title: "Crafted",
    categories: resolveCraftedCategories(crafted),
  });

  return categoryGroups;
}

const resolveAchievementRewardCategory = (loot, rewards) => {
  const rewardItems = new Set(rewards);

  return {
    title: "Achievement rewards",
    key: "achievement_rewards",
    items: loot.filter(({ id }) => rewardItems.has(id)),
  };
};

const resolveActivityCategory = (loot, activitiesTable) => {
  const activityItems = new Set(activitiesTable.flatMap(({ items }) => items));

  return {
    title: "Activity Drops",
    key: "loot_activities",
    items: loot.filter(({ id }) => activityItems.has(id)),
  };
};

const resolveChestCategories = (loot, chestTables) => {
  const excludedForMultipleCheck = ["jarvonia chest table", "gdte chest table"];
  const itemToTablesMap = {};
  const multipleSourcesItems = new Set();
  const chestTableCategories = [];

  // Step 1: Build mapping of which item belongs to which chest
  for (const table of chestTables) {
    const tableName = table.name;
    for (const item of table.items) {
      if (!itemToTablesMap[item]) itemToTablesMap[item] = [];
      itemToTablesMap[item].push(tableName);
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
    const itemIds = new Set(table.items);

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
        items: filteredItems,
      });
    }
  }

  console.log(multipleSourcesItems);
  // Multiple chest sources category
  const multipleItems = loot.filter((item) =>
    multipleSourcesItems.has(item.id)
  );
  if (multipleItems.length > 0) {
    chestTableCategories.unshift({
      title: "Multiple Chest Sources",
      key: "chest_multiple",
      items: multipleItems,
    });
  }

  const chestItemsList = new Set(Object.keys(itemToTablesMap));
  return { chestCategories: chestTableCategories, chestItemsList };
};

const resolveCraftedCategories = (crafted) => {
  const categories = [
    { suffix: "hatchets", keyword: "woodcuttingHatchet" },
    { suffix: "pickaxes", keyword: "pickaxe" },
    { suffix: "sickles", keyword: "sickle" },
    { suffix: "fishing tools", keyword: "fishingTool" },
    { suffix: "diving gear", keyword: "itemset_diving_gear" },
    { suffix: "amulets", keyword: "item_amulet" },
    { suffix: "rings", keyword: "item_ring", qualities: 2 },
    { suffix: "weapons", keyword: "weapon" },
    { suffix: "shields", keyword: "shield" },
  ].map(({ suffix, keyword, qualities }) => {
    return {
      title: `Crafted ${capitalize(suffix)}`,
      key: `crafted_${suffix}`,
      qualities: qualities || 1,
      items: crafted.filter(({ keywords }) => keywords.includes(keyword)),
    };
  });

  const miscCraftedItems = resolveMiscItems(crafted, categories);
  if (miscCraftedItems.length)
    categories.push({
      title: "Misc. Crafted",
      key: "misc_crafted",
      qualities: 1,
      items: miscCraftedItems,
    });

  return categories;
};

const resolveMiscItems = (crafted, categories) => {
  const resolvedItemIds = new Set(
    categories.flatMap(({ items }) => items.map(({ id }) => id))
  );
  return crafted.filter(({ id }) => !resolvedItemIds.has(id));
};

const resolveRewardsCategories = (loot, rewards) => {
  const achievement_rewards = new Set(
    rewards
      .filter(({ type }) => type === "achievementPoints")
      .flatMap(({ rewardItems }) => rewardItems)
  );
  const reputation_rewards = new Set(
    rewards
      .filter(({ type }) => type === "factionReputation")
      .flatMap(({ rewardItems }) => rewardItems)
  );
  return [
    {
      title: "Achievement point rewards",
      key: "achievement_point_rewards",
      items: loot.filter(({ id }) => achievement_rewards.has(id)),
    },
    {
      title: "Repuation rewards",
      key: "reputation_rewards",
      items: loot.filter(({ id }) => reputation_rewards.has(id)),
    },
  ];
};

const resolveShopsCategory = (loot, shopItems, chestItems) => {
  const shopSet = new Set(shopItems);

  return {
    title: "Shop Items",
    key: "loot_shops",
    items: loot.filter(({ id }) => shopSet.has(id) && !chestItems.has(id)),
  };
};
