import express from 'express';
import { createUserController, forgotPasswordController, getCurrentUserController, loginController, updateUserController } from '../controllers/userController.js';
import { uploadProfilePicture } from '../middlewares/uploadMiddleware.js';
import { authValidation, requireActiveAccount } from '../middlewares/authMiddleware.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/auth/register', uploadProfilePicture.single('profilePicture'), createUserController);

router.post('/auth/login', loginController);

router.post('/auth/forgot-password', forgotPasswordController);

// ====================================
// PATCH
// ====================================
router.patch(
  '/users/me',
  authValidation(),
  requireActiveAccount(),
  uploadProfilePicture.single('profilePicture'),
  updateUserController
);

// ====================================
// GET
// ====================================
router.get('/auth/me', authValidation(), getCurrentUserController);


export default router;