import express from 'express';
import { createUserController, loginController } from '../controllers/userController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/register', createUserController);

router.post('/login', loginController);



export default router;