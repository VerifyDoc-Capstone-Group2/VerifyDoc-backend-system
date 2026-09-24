import express from 'express';
import { createUserController } from '../controllers/userController';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/', createUserController);



export default router;