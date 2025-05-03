import { skillService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listSkills = wrapController(() => skillService.list());

export const getSkill = wrapController(
  (req) => {
    const { skill } = req.params;
    return skillService.get(skill);
  },
  {
    notFoundMessage: "Skill not found",
  }
);
