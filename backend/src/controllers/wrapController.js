import { errorHandler } from "../middleware/errorHandler.js";

export function wrapController(serviceFunction, options = {}) {
  const {
    successStatus = 200,
    notFoundStatus = 404,
    notFoundMessage = "Not Found",
    errorMessage = "Internal Server Error",
    mapFunction,
  } = options;

  return async (req, res, next) => {
    try {
      const result = await serviceFunction(req);

      if (result === null) {
        return res.status(notFoundStatus).json({ message: notFoundMessage });
      }

      const mappedResult = mapFunction ? mapFunction(result) : result;
      return res.status(successStatus).json(mappedResult);
    } catch (error) {
      return errorHandler(error, req, res, next);
    }
  };
}
