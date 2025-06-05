import { statService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listStats = wrapController(() => statService.list());

export const getStat = wrapController(
  (req) => {
    const { stat } = req.params;
    return statService.get(stat);
  },
  {
    notFoundMessage: "Stat not found",
  }
);
