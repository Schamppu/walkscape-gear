import { activityService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listActivities = wrapController(() => activityService.list());

export const getActivities = wrapController((req) => {
  const skill = req.params;
  console.log(skill);
});

export const searchActivities = wrapController((req) => {
  const { query } = req;
  return activityService.search(query);
});

export const getActivity = wrapController(
  (req) => {
    const { id } = req.params;
    return activityService.getById(id);
  },
  {
    notFoundMessage: "Activity not found",
  }
);
