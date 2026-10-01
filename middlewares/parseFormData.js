import { AppError } from "../errors/AppError.js";

export const parseFormData = (fields = []) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (req.body[field]) {
          req.body[field] = JSON.parse(req.body[field]);
        }
      }

      next();
    } catch (error) {
      next(new AppError('Invalid form data', 400));
    }
  };
};