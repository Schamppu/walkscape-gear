export const createUrlMapping = (items, consumables, activities, locations) => {
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
  groupedItems["location"] = [null].concat(locations.map((item) => item.id));
  groupedItems["potion"] = [null];
  groupedItems["service"] = [null];
  return groupedItems;
};
