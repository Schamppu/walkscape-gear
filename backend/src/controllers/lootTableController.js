import { lootTableService } from "../services/index.js";

const mapTableRows = ({ rowItemID }) => rowItemID;

export const fetchActivityItems = () =>
  lootTableService.search({ category: "normal", detailed: true }).then((arr) =>
    arr.map(({ id, name, category, tableRows }) => {
      return {
        id,
        name,
        category,
        items: tableRows.map(mapTableRows).filter((item) => item),
      };
    })
  );

export const fetchChestItems = () =>
  lootTableService.search({ category: "chest", detailed: true }).then((arr) =>
    arr.map(({ id, name, category, tableRows, subTables }) => {
      return {
        id,
        name,
        category,
        items: tableRows
          .map(mapTableRows)
          .concat(
            subTables.flatMap(({ tableRows }) => tableRows.map(mapTableRows))
          )
          .filter((item) => item),
      };
    })
  );
