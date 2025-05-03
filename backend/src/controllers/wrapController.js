import { errorHandler } from "../middleware/errorHandler.js";

export function wrapController(serviceFunction, options = {}) {
  const {
    successStatus = 200,
    notFoundStatus = 404,
    notFoundMessage = "Not Found",
    errorMessage = "Internal Server Error",
  } = options;

  return async (req, res, next) => {
    try {
      const result = await serviceFunction(req);

      if (result === null) {
        return res.status(notFoundStatus).json({ message: notFoundMessage });
      }

      return res.status(successStatus).json(result);
    } catch (error) {
      return errorHandler(error, req, res, next);
    }
  };
}
