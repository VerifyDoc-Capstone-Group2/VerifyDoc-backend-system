import { AppError } from "../errors/AppError.js";

// Per-process limiter. For multiple Render instances, replace with a shared store or edge limiter.
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

export const publicVerificationRateLimit = (req, _res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  if (buckets.size > 10_000) {
    for (const [ip, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(ip);
    }
    if (buckets.size > 10_000) buckets.clear();
  }
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) return next(new AppError("Too many verification requests. Please try again shortly.", 429));
  next();
};
