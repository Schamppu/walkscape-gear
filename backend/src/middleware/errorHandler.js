export function errorHandler(err, req, res, next) {
  console.error(err.status, req.originalUrl);
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
}