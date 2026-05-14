export const createItemValueMap = (
  crafted,
  loot,
  consumables,
  materials,
  containers,
  chestTables,
) => {
  // Crafted items have all qualities pre-calculated in itemValue.value
  const craftedValues = Object.fromEntries(
    crafted.map(({ id, itemValue }) => [id, itemValue.value]),
  );

  // Loot items are stored with their specific quality only
  const lootValues = Object.fromEntries(
    loot
      .filter(({ itemValue }) => itemValue.currency === "money")
      .map(({ id, itemValue, quality }) => {
        return [id, { [quality]: itemValue.value[quality] }];
      }),
  );

  // Consumables and materials use pre-calculated values; skip non-money items (tokens)
  const consumableValues = Object.fromEntries(
    consumables
      .filter(({ itemValue }) => itemValue.currency === "money")
      .map(({ id, itemValue }) => [id, itemValue.value]),
  );
  const materialValues = Object.fromEntries(
    materials
      .filter(({ itemValue }) => itemValue.currency === "money")
      .map(({ id, itemValue }) => [id, itemValue.value]),
  );
  const chestValues = resolveChestValues(
    containers,
    chestTables,
    lootValues,
    consumableValues,
    materialValues,
  );

  return {
    ...craftedValues,
    ...lootValues,
    ...consumableValues,
    ...materialValues,
    ...chestValues,
  };
};

const resolveChestValues = (
  containers,
  chestTables,
  lootValues,
  consumableValues,
  materialValues,
) => {
  const bird_nest = { common: 61.9801992 };
  const gem_pouch = { common: 140.449358 };

  const itemValues = {
    ...lootValues,
    ...consumableValues,
    ...materialValues,
    gem_pouch,
  };
  const getTablePrice = (table, weight) => {
    const tableWeight = table
      .map(({ rowWeight }) => rowWeight)
      .reduce((total, weight) => total + weight, 0);
    const price = table.map(
      ({
        rowItemID,
        isMoney,
        rowWeight,
        rowMaximumAmount,
        rowMinimumAmount,
      }) => {
        const amount = (rowMaximumAmount + rowMinimumAmount) / 2;
        const chance = (weight * rowWeight) / tableWeight;
        if (rowItemID === null && isMoney) {
          return amount * chance;
        }

        const item = itemValues[rowItemID];
        if (item && "fine" in item) {
          const price = 0.99 * item["common"] + 0.01 * item["fine"];
          return amount * chance * price;
        } else if (item && Object.values(item).length === 1) {
          const price = Object.values(item)[0];
          return amount * chance * price;
        } else {
          // console.log("???", rowItemID);
          return 0;
        }
      },
    );
    return price.reduce((total, value) => total + value, 0);
  };

  const out = containers
    .map(({ id, quality, tables }) => {
      const table = tables.flatMap((innerTables) => {
        const [table] = innerTables.tables;
        return chestTables.find(({ id }) => id === table);
      });
      return { id, quality, table: table[0] };
    })
    .filter(({ table }) => Boolean(table))
    .map(({ id, quality, table }) => {
      const subTables = table.subTables.filter(
        ({ tableRows }) => tableRows.length,
      );
      const subTableTotalWeight = subTables
        .map(({ weight }) => weight)
        .reduce((total, weight) => total + weight, 0);
      const tablePrice = getTablePrice(
        table.tableRows,
        1 - subTableTotalWeight,
      );
      const subTablePrices = subTables.map(({ weight, tableRows }) =>
        getTablePrice(tableRows, weight),
      );
      const price =
        4 * (tablePrice + subTablePrices.reduce((a, b) => a + b, 0));
      const out = {};
      out[quality] = price;
      return [id, out];
    });
  return { ...Object.fromEntries(out), bird_nest };
};
