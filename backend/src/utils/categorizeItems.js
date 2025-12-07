import { capitalize } from "./string.js";

export function categorizeItems(data) {
  const {
    collectibles,
    crafted,
    loot,
    containers,
    consumables,
    chestItems,
    ...sourceInfo
  } = data;

  const { chestCategories } = resolveChestCategories(
    loot,
    chestItems,
    containers
  );

  const categoryGroups = [
    { title: "Collectibles", source: collectibles, excludedItems: [] },
    { title: "Loot", source: loot, excludedItems: chestCategories },
  ].map((cat) => resolveCategories(cat, sourceInfo));

  categoryGroups.push({ title: "Chests", categories: chestCategories });
  categoryGroups.push({
    title: "Crafted",
    categories: resolveCraftedCategories(crafted),
  });
  categoryGroups.splice(1, 0, {
    title: "Consumables",
    categories: resolveConsumables(consumables),
  });

  categoryGroups.forEach(({ categories }) => {
    categories.sort((a, b) => a.title.localeCompare(b.title));
  });

  return categoryGroups;
}

const resolveCategories = (category, data) => {
  const { title, source: items, excludedItems } = category;

  const { activityItems, itemRewards, achievementRewardItems, shopItems } =
    data;
  const activityCategory = resolveActivityCategory(category, activityItems);
  const rewardCategories = resolveRewardsCategories(category, itemRewards);
  const achivementRewardCategory = resolveAchievementRewardCategory(
    category,
    achievementRewardItems
  );
  const shopsCategory = resolveShopsCategory(category, shopItems);
  const categories = [
    ...rewardCategories,
    achivementRewardCategory,
    shopsCategory,
    activityCategory,
  ];

  const miscCategory = resolveMiscItems(items, [
    ...categories,
    ...excludedItems,
  ]);

  if (miscCategory.length) {
    categories.push({
      title: `Misc. ${title}`,
      key: `misc_${title.toLowerCase()}`,
      items: miscCategory,
    });
  }

  return {
    title,
    categories: categories.filter(({ items }) => items.length > 0),
  };
};

const resolveAchievementRewardCategory = (category, rewards) => {
  const { title, source } = category;
  const rewardItems = new Set(rewards);

  return {
    title: "Achievement rewards",
    key: `achievement_rewards_${title.toLowerCase()}`,
    items: source.filter(({ id }) => rewardItems.has(id)),
  };
};

const resolveActivityCategory = (category, activitiesTable) => {
  const { title, source } = category;
  const activityItems = new Set(activitiesTable.flatMap(({ items }) => items));

  return {
    title: "Activity Drops",
    key: `activity_drops_${title.toLowerCase()}`,
    items: source.filter(({ id }) => activityItems.has(id)),
  };
};

const resolveRewardsCategories = (category, rewards) => {
  const { title, source } = category;
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
      key: `achievement_point_rewards_${title.toLowerCase()}`,
      items: source.filter(({ id }) => achievement_rewards.has(id)),
    },
    {
      title: "Reputation rewards",
      key: `reputation_rewards_${title.toLowerCase()}`,
      items: source.filter(({ id }) => reputation_rewards.has(id)),
    },
  ];
};

const resolveShopsCategory = (category, shopItems) => {
  const { title, source } = category;
  const shopSet = new Set(shopItems);

  return {
    title: "Shop Items",
    key: `shop_items_${title.toLowerCase()}`,
    items: source.filter(({ id }) => shopSet.has(id)),
  };
};

const resolveChestCategories = (loot, chestTables, containers) => {
  const chestTableCategories = [];

  const nameLookup = Object.fromEntries(
    containers.flatMap(({ tables, name }) =>
      tables.flatMap(({ tables: ts }) => ts.map((id) => [id, name]))
    )
  );

  for (const table of chestTables) {
    const itemIds = new Set(table.items);
    const containerName =
      nameLookup[table.id] || `${capitalize(table.name.split(" ")[0])} chest`;

    let filteredItems = loot.filter((item) => itemIds.has(item.id));

    if (filteredItems.length > 0) {
      chestTableCategories.push({
        title: containerName,
        key: `chest_${table.name.toLowerCase().replace(/\s+/g, "_")}`,
        items: filteredItems,
      });
    }
  }

  return { chestCategories: chestTableCategories };
};

const resolveCraftedCategories = (crafted) => {
  const categories = [
    { suffix: "hatchets", keyword: "hatchet" },
    { suffix: "pickaxes", keyword: "pickaxe" },
    { suffix: "sickles", keyword: "sickle" },
    { suffix: "fishing tools", keyword: "fishing_tool" },
    { suffix: "diving gear", keyword: "diving_gear" },
    { suffix: "amulets", keyword: "amulet", type: "neck" },
    { suffix: "rings", keyword: "ring", qualities: 2 },
    { suffix: "weapons", keyword: "weapon" },
    { suffix: "shields", keyword: "shield" },
    { suffix: "pans", keyword: "cooking_pan" },
    { suffix: "chisels", keyword: "chisel" },
    { suffix: "hammers", keyword: "smithing_hammer" },
    { suffix: "wrenches", keyword: "wrench" },
    { suffix: "saws", keyword: "saw" },
  ].map(({ suffix, keyword, type, qualities }) => {
    return {
      title: `Crafted ${capitalize(suffix)}`,
      key: `crafted_${keyword}`,
      qualities: qualities || 1,
      items: crafted.filter(
        ({ keywords, gearType }) =>
          keywords.includes(keyword) || gearType === type
      ),
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

const resolveConsumables = (consumables) => {
  const filteredConsumables = consumables.filter(
    ({ consumableType }) => consumableType == "food"
  );

  const grouped = {};
  for (const item of filteredConsumables) {
    // Find the first keyword present in the item's keywords array
    item.keywords.forEach((keyword) => {
      if (!keyword) return;
      if (!grouped[keyword]) grouped[keyword] = [];
      grouped[keyword].push(item);
    });
  }

  // Filter out unwanted categories
  const categoriesToExclude = [
    "alcohol",
    "beverage",
    "cooked_fish",
    "food",
    "sandwich",
    "search_beverage",
    "search_food",
  ];
  for (const category of categoriesToExclude) {
    delete grouped[category];
  }

  return Object.entries(grouped).map(([category, items]) => ({
    title: `${capitalize(category.replace("search_", ""))} consumables`,
    key: category,
    items,
  }));
};

const resolveMiscItems = (source, categories) => {
  const resolvedItemIds = new Set(
    categories.flatMap(({ items }) => items.map(({ id }) => id))
  );
  return source.filter(({ id }) => !resolvedItemIds.has(id));
};
