import { lootTableService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

const mapTableRows = ({ rowItemID }) => rowItemID;

export const getChestItems = wrapController(
  () => lootTableService.search({ category: "chest", detailed: true }),
  {
    mapFunction: (arr) =>
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
      }),
  }
);

export const getActivityItems = wrapController(
  () => lootTableService.search({ category: "normal", detailed: true }),
  {
    mapFunction: (arr) =>
      arr.map(({ id, name, category, tableRows }) => {
        return {
          id,
          name,
          category,
          items: tableRows.map(mapTableRows).filter((item) => item),
        };
      }),
  }
);
