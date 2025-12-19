import { Router } from "express";
import { wrapController } from "../controllers/wrapController.js";

export const createBaseRouter = (name, service, additionalRoutes = []) => {
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

  router.post(
    "/ids",
    wrapController((req) => {
      const { ids, target } = req.body;
      if (!Array.isArray(ids)) {
        throw new Error("ids must be an array");
      }
      return service.getIds(ids, target);
    })
  );

  router.post(
    "/multiple",
    wrapController((req) => {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        throw new Error("ids must be an array");
      }
      return service.getMultiple(ids);
    })
  );

  // Add additional routes before the catch-all /:id route
  additionalRoutes.forEach(({ method, path, handler }) => {
    router[method](path, handler);
  });

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
