const BASE_PATHS = {
  general: "assets/icons/text/general_icons/",
  button: "assets/icons/text/button_icons/",
  devtools: "assets/devtools/icons/",
  items: "assets/icons/items/",
  currencies: "assets/icons/items/currencies/",
  skilling: "assets/icons/text/stats/skilling/",
};

const withBase = (base, files) =>
  Object.fromEntries(
    Object.entries(files).map(([key, file]) => [
      key,
      `${BASE_PATHS[base]}${file}`,
    ])
  );

export const abilityTypeIconPaths = withBase("general", {
  passive: "ability_passive.png",
  active: "ability_active.png",
  book: "ability_book.png",
  charge: "ability_charge.png",
  consumable: "ability_consumable.png",
  activity: "ability_activity.png",
  emergency: "ability_emergency.png",
});

export const icons = {
  ...abilityTypeIconPaths,
  ...withBase("general", {
    actions: "actions.png",
    activity: "activity.png",
    AP: "achievement_point.png",
    character: "character.png",
    gear2: "gear2.png",
    settings: "settings.png",
    steps: "steps.png",
    show: "show.png",
    switch: "switch_gear_set.png",
  }),
  ...withBase("button", {
    deposit: "deposit.png",
    delete: "delete.png",
    equip: "equip.png",
    unequip: "unequip.png",
  }),
  ...withBase("skilling", {
    WE: "work_efficiency.png",
    DR: "double_result.png",
    DA: "double_action.png",
  }),
  ...withBase("items", {
    money: "money.png",
  }),
  ...withBase("currencies", {
    token: "adventure_guild_token.png",
  }),
  cooldowns: `${BASE_PATHS.devtools}cooldowns.png`,
};
