const BASE_PATHS = {
  general: "assets/icons/text/general_icons/",
  button: "assets/icons/text/button_icons/",
  devtools: "assets/devtools/icons/",
  items: "assets/icons/items/",
  currencies: "assets/icons/items/currencies/",
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
    settings: "settings.png",
    steps: "steps.png",
  }),
  ...withBase("button", {
    deposit: "deposit.png",
    delete: "delete.png",
    equip: "equip.png",
    unequip: "unequip.png",
  }),
  ...withBase("items", {
    money: "money.png",
  }),
  ...withBase("currencies", {
    token: "adventure_guild_token.png",
  }),
  cooldowns: `${BASE_PATHS.devtools}cooldowns.png`,
};
