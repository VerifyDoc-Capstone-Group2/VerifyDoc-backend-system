export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (err.code === 11000) return res.status(409).json({ message: "A resource with that value already exists" });
  if (err.name === "ValidationError") return res.status(400).json({ message: "Validation failed" });

  // Invalid JSON and payload-limit errors are client errors, not server failures.
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Malformed JSON request body" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request body too large" });

  const status = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode : 500;
  if (status >= 500) {
    console.error("Unhandled request error:", { method: req.method, path: req.path, name: err.name });
  }
  // Do not expose internal exception messages to clients.
  return res.status(status).json({ message: status >= 500 ? "Internal server error" : (err.message || "Request failed") });
};
