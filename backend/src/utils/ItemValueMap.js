import { qualityOptions } from "./qualityOptions.js";
import { price } from "./ItemValue.js";

const token_items = [
  "adventurers_enamel_pin",
  "name_tag",
  "unidentified_remains",
];

export const createItemValueMap = (
  crafted,
  loot,
  consumables,
  materials,
  containers,
  chestTables,
) => {
  const getLootvalue = (items, qualityValues = null) =>
    items.map(({ id, itemValue, itemValueModifier, quality }) => [
      id,
      Object.fromEntries(
        (qualityValues || [quality]).map((quality) => [
          quality,
          price(itemValue, itemValueModifier, quality),
        ]),
      ),
    ]);

  const getItemValue = (items) =>
    items.map(({ id, itemValue, itemValueModifier, canBeFine }) => {
      const options = canBeFine ? ["common", "fine"] : ["common"];
      return [
        id,
        Object.fromEntries(
          options.map((quality) => [
            quality,
            price(itemValue, itemValueModifier, "common", quality === "fine"),
          ]),
        ),
      ];
    });

  const craftedValues = Object.fromEntries(
    getLootvalue(crafted, qualityOptions),
  );
  const lootValues = Object.fromEntries(getLootvalue(loot));
  const consumableValues = Object.fromEntries(getItemValue(consumables));
  const materialValues = Object.fromEntries(
    getItemValue(materials).filter(([id]) => !token_items.includes(id)),
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
  const bird_nest = { common: 80.8 };
  const gem_pouch = { common: 136.6 };

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
          console.log("???", rowItemID);
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
