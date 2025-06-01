import { activityService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listActivities = wrapController(() => activityService.list());

export const getActivity = wrapController(
  (req) => {
    const { id } = req.params;
    return activityService.getById(id);
  },
  {
    notFoundMessage: "Activity not found",
  }
);
