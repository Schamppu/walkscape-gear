import { Router } from "express";
import { wrapController } from "../controllers/wrapController.js";

export const createBaseRouter = (name, service) => {
  const router = Router();

  router.get(
    "/",
    wrapController(() => service.list())
  );

  router.get(
    "/search/",
    wrapController((req) => {
      const params = req.query;
      return service.search(params);
    })
  );

  router.get(
    "/:id",
    wrapController(
      (req) => {
        const { id } = req.params;
        return service.getById(id);
      },
      {
        notFoundMessage: `${name} not found`,
      }
    )
  );

  return router;
};
