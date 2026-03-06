import { capitalize } from "./string.js";

export function categorizeItems(data) {
  const {
    collectibles,
    crafted,
    loot,
    containers,
    consumables,
    chestItems,
    allRecipes,
    pets,
    ...sourceInfo
  } = data;

  const {
    craftingRecipes,
    trinketryRecipes,
    smithingRecipes,
    tailoringRecipes,
  } = allRecipes;
  const { chestCategories } = resolveChestCategories(
    loot,
    chestItems,
    containers,
  );

  const categoryGroups = [
    { title: "Collectibles", source: collectibles, excludedItems: [] },
    { title: "Loot", source: loot, excludedItems: chestCategories },
  ].map((cat) => resolveCategories(cat, sourceInfo));

  categoryGroups.push({ title: "Chests", categories: chestCategories });
  categoryGroups.push({
    title: "Crafted",
    categories: resolveCraftedCategories(crafted, allRecipes, loot),
  });
  categoryGroups.splice(1, 0, {
    title: "Consumables",
    categories: resolveConsumables(consumables),
  });

  categoryGroups.push({
    title: "Pets",
    categories: resolvePetCategories(pets),
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
    achievementRewardItems,
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
      .flatMap(({ rewardItems }) => rewardItems),
  );
  const reputation_rewards = new Set(
    rewards
      .filter(({ type }) => type === "factionReputation")
      .flatMap(({ rewardItems }) => rewardItems),
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
      tables.flatMap(({ tables: ts }) => ts.map((id) => [id, name])),
    ),
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

const resolvePetCategories = (pets) => {
  return [
    {
      title: `All Pets`,
      key: `pets`,
      qualities: 1,
      items: pets,
    },
  ];
};

const resolveCraftedCategories = (crafted, allRecipes, loot) => {
  // Pre-group items by keyword and gearType to avoid O(categories × items) iteration.
  const byKeyword = new Map();
  const byGearType = new Map();

  for (const item of crafted) {
    if (item.gearType) {
      if (!byGearType.has(item.gearType)) byGearType.set(item.gearType, []);
      byGearType.get(item.gearType).push(item);
    }
    if (Array.isArray(item.keywords)) {
      for (const kw of item.keywords) {
        if (!kw) continue;
        if (!byKeyword.has(kw)) byKeyword.set(kw, []);
        byKeyword.get(kw).push(item);
      }
    }
  }

  const categoryDefs = [
    { suffix: "hatchets", keyword: "hatchet" },
    { suffix: "pickaxes", keyword: "pickaxe" },
    { suffix: "sickles", keyword: "sickle" },
    { suffix: "fishing tools", keyword: "fishing_tool" },
    { suffix: "diving gear", keyword: "diving_gear" },
    { suffix: "amulets", keyword: "amulet", type: "neck" },
    { suffix: "rings", keyword: "ring", qualities: 2 },
    { suffix: "hunting bows", keyword: "hunting_bow" },
    { suffix: "weapons", keyword: "weapon" },
    { suffix: "shields", keyword: "shield" },
    { suffix: "pans", keyword: "cooking_pan" },
    { suffix: "chisels", keyword: "chisel" },
    { suffix: "hammers", keyword: "smithing_hammer" },
    { suffix: "wrenches", keyword: "wrench" },
    { suffix: "saws", keyword: "saw" },
    { suffix: "toolboxes", keyword: "toolbox" },
    { suffix: "pants", type: "legs" },
    { suffix: "gloves", type: "hands" },
    { suffix: "chests", type: "chest" },
  ];

  const categories = categoryDefs.map(
    ({ suffix, keyword, type, qualities }) => {
      let items;
      if (keyword && type) {
        // Union (OR): items with keyword OR matching gearType, deduplicated by id.
        const seen = new Map();
        for (const item of byKeyword.get(keyword) ?? [])
          seen.set(item.id, item);
        for (const item of byGearType.get(type) ?? []) seen.set(item.id, item);
        items = [...seen.values()];
      } else if (keyword) {
        items = byKeyword.get(keyword) ?? [];
      } else if (type) {
        items = byGearType.get(type) ?? [];
      } else {
        items = [];
      }

      return {
        title: `Crafted ${capitalize(suffix)}`,
        key: `crafted_${keyword ?? type}`,
        qualities: qualities || 1,
        items,
      };
    },
  );

  const upgraded = resolveUpgradedItems(crafted, allRecipes, loot);
  if (upgraded.length)
    categories.push({
      title: "Upgraded Items",
      key: "upgraded_crafted",
      qualities: 1,
      items: upgraded,
    });

  const miscCraftedItems = resolveMiscItems(crafted, categories);
  if (miscCraftedItems.length)
    categories.push({
      title: "Misc. Crafted",
      key: "misc_crafted",
      qualities: 1,
      items: miscCraftedItems,
    });

  const recipeLevels = Object.fromEntries(
    allRecipes.flatMap(({ itemRewards, requirements }) => {
      const id = Object.keys(itemRewards)[0];
      const skills = requirements.filter(({ type }) => type == "skillLevel");
      const level = skills.length ? skills[0].requirement["level"] : 1;
      return [[id, level]];
    }),
  );

  const sortedCategories = categories
    .filter((category) => category.items.length > 0)
    .map((category) => ({
      ...category,
      items: [...category.items].sort((a, b) => {
        return recipeLevels[a.id] - recipeLevels[b.id];
      }),
    }));

  return sortedCategories;
};

const resolveConsumables = (consumables) => {
  const filteredConsumables = consumables.filter(
    ({ consumableType }) => consumableType == "food",
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
    categories.flatMap(({ items }) => items.map(({ id }) => id)),
  );
  return source.filter(({ id }) => !resolvedItemIds.has(id));
};

const resolveUpgradedItems = (source, allRecipes, loot) => {
  const lootIdMap = Object.fromEntries(loot.map(({ id }) => [id, true]));

  const upgradedItems = new Set(
    allRecipes
      .map(({ itemRewards, materials }) => [
        Object.keys(itemRewards)[0],
        materials.flatMap(({ options }) => options.flatMap(({ item }) => item)),
      ])
      .filter(([_, materials]) => materials.some((item) => item in lootIdMap))
      .map(([id, _]) => id),
  );
  return source.filter(({ id }) => upgradedItems.has(id));
};
