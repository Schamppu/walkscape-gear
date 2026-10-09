export function errorHandler(err, req, res, next) {
  console.error(err.status, req.originalUrl);
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ message: status === 500 ? "Internal Server Error" : err.message });
}