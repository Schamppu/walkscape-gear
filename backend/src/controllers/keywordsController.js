import { keywordService } from "../services/index.js";
import { wrapController } from "./wrapController.js";

export const listKeywords = wrapController(() => keywordService.list());

export const getKeyword = wrapController(
  (req) => {
    const { id } = req.params;
    return keywordService.get(id);
  },
  {
    notFoundMessage: "Keyword not found",
  }
);
