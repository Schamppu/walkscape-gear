export const createUrlMapping = (
  items,
  consumables,
  activities,
  recipes,
  locations,
  pets
) => {
  const groupedItems = {};
  items.forEach((item) => {
    const { gearType, id } = item;
    const key = gearType;
    if (!groupedItems[key]) {
      groupedItems[key] = [null];
    }
    groupedItems[key].push(id);
  });

  groupedItems["consumable"] = [null].concat(
    consumables.map((item) => item.id)
  );
  groupedItems["activity"] = [null].concat(activities.map((item) => item.id));
  groupedItems["recipe"] = [null].concat(recipes.map((item) => item.id));
  groupedItems["location"] = [null].concat(locations.map((item) => item.id));
  groupedItems["pet"] = [null].concat(pets.map((item) => item.id));
  groupedItems["service"] = [null];
  return groupedItems;
};
