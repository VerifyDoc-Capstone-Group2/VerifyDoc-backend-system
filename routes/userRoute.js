import express from 'express';
import { createUserController, loginController } from '../controllers/userController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/auth/register', createUserController);

router.post('/auth/login', loginController);



export default router;