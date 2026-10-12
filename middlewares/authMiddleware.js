import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/userModel.js";

export const authValidation = () => (req, res, next) => {
  const header = req.headers.authorization;
  if (typeof header !== "string") {
    return res.status(401).json({ message: "Authentication token required" });
  }

  // Require exactly one Bearer token; reject ambiguous or malformed headers.
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  if (!match) return res.status(401).json({ message: "Invalid authorization header" });
  if (!process.env.JWT_SECRET) return next(new AppError("Authentication is unavailable", 503));

  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded || typeof decoded !== "object" || !mongoose.isValidObjectId(decoded.userId)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorizeAdminRoles = () => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication token required" });
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Unauthorized access, only admins can access this route" });
  }
  next();
};

export const requireActiveAccount = () => async (req, _res, next) => {
  try {
    if (!req.user?.userId || !mongoose.isValidObjectId(req.user.userId)) {
      throw new AppError("Authentication required", 401);
    }
    const existingUser = await User.findById(req.user.userId);
    if (!existingUser) throw new AppError("User not found", 401);
    if (existingUser.accountStatus !== "Active") throw new AppError("User account status is not active", 403);
    // Never trust an authorization role from an old JWT after the database role changes.
    req.user.role = existingUser.role;
    next();
  } catch (error) {
    next(error);
  }
};
