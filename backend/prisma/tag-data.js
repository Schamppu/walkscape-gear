export const skillTags = [
  { id: "agility", name: "Agility" },
  { id: "carpentry", name: "Carpentry" },
  { id: "cooking", name: "Cooking" },
  { id: "crafting", name: "Crafting" },
  { id: "fishing", name: "Fishing" },
  { id: "foraging", name: "Foraging" },
  { id: "mining", name: "Mining" },
  { id: "smithing", name: "Smithing" },
  { id: "trinketry", name: "Trinketry" },
  { id: "woodcutting", name: "Woodcutting" },
];

export const attributeTags = [
  { id: "bonus_experience", name: "Bonus Experience" },
  { id: "chest_find", name: "Chest Finding" },
  { id: "crafting_quality", name: "Crafting Outcome" },
  { id: "double_action", name: "Double Action" },
  { id: "double_result", name: "Double Rewards" },
  { id: "find_bird_nests", name: "Find Bird Nests" },
  { id: "find_collectibles", name: "Find Collectibles" },
  { id: "find_gems", name: "Find Gems" },
  { id: "fine_material_find", name: "Fine Material Finding" },
  { id: "inventory_space", name: "Inventory Space" },
  { id: "nomaterialsconsumed", name: "No Materials Consumed" },
  { id: "steps_required", name: "Steps Required" },
  { id: "work_efficiency", name: "Work Efficiency" },
];

export const otherTags = [
  {
    id: "bonus_ag_token",
    name: "AG tokens",
    icon: "assets/icons/text/stats/skilling/bonus_ag_token.png",
  },
  {
    id: "money",
    name: "Money",
    icon: "assets/icons/text/stats/skilling/bonus_money.png",
  },
  {
    id: "travel",
    name: "Travel",
    icon: "assets/icons/text/stats/skilling/traveling_distance.png",
  },
];

export const allTags = [...skillTags, ...attributeTags, ...otherTags];

// For backward compatibility - list of valid tag IDs
export const validTags = allTags.map((tag) => tag.id);
