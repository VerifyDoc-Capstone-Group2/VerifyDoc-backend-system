import express from 'express';
import { createUserController, loginController, updateUserController } from '../controllers/userController.js';
import { uploadProfilePicture } from '../middlewares/uploadMiddleware.js';
import { authValidation } from '../middlewares/authMiddleware.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/auth/register', uploadProfilePicture.single('profilePicture'), createUserController);

router.post('/auth/login', loginController);

// ====================================
// PATCH
// ====================================
router.patch(
  '/users/me',
  authValidation(),
  uploadProfilePicture.single('profilePicture'),
  updateUserController
);

export default router;