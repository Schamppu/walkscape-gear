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
  { id: "bonus_experience", name: "Experience" },
  { id: "chest_find", name: "Chest Find" },
  { id: "crafting_quality", name: "Quality Outcome" },
  { id: "double_action", name: "Double Action" },
  { id: "double_result", name: "Double Rewards" },
  { id: "find_bird_nests", name: "Bird Nests" },
  { id: "find_collectibles", name: "Collectibles" },
  { id: "find_gems", name: "Gems" },
  { id: "fine_material_find", name: "Fine Materials" },
  { id: "inventory_space", name: "Inventory Space" },
  { id: "nomaterialsconsumed", name: "No Materials Consumed" },
  { id: "steps_required", name: "Steps Required" },
  { id: "work_efficiency", name: "Work Efficiency" },
];

export const factionTags = [
  { id: "tutorial_area", name: "Tutorial Area" },
  { id: "jarvonia", name: "Jarvonia" },
  { id: "erdwise", name: "Erdwise" },
  { id: "trellin", name: "Trellin" },
  { id: "gdte", name: "GDTE" },
  { id: "halfling_rebels", name: "Halfling Rebels" },
  { id: "syrenthia", name: "Syrenthia" },
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
  {
    id: "underwater",
    name: "Underwater",
    icon: "assets/icons/keywords/itemset_diving_gear_expert.png",
  },
];

export const allTags = [
  ...skillTags,
  ...attributeTags,
  ...factionTags,
  ...otherTags,
];

// For backward compatibility - list of valid tag IDs
export const validTags = allTags.map((tag) => tag.id);
