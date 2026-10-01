import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { User } from '../models/userModel.js';

export const authValidation = () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication token required"
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required'
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = decoded;

      next();

    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

  }
};


export const authorizeAdminRoles = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        message: 'Authentication token required'
      });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        message: 'Unauthorized access, only admins can access this route'
      });
    }

    next();
  }
};


export const requireActiveAccount = () => {
  return async (req, res, next) => {

    if (!req.user) {
      throw new AppError('Authentication token required, user is not logged in', 403);
    };

    const existingUser = await User.findById(req.user.userId);

    if (!existingUser) {
      throw new AppError('User not found', 404);
    };

    if (existingUser.accountStatus !== 'Active') {
      throw new AppError('User account status is not active', 403);
    };

    next();
  }
};