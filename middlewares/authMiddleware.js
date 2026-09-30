import jwt from 'jsonwebtoken';

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