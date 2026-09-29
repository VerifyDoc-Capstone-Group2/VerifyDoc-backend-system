import express from 'express';
import { registerOrganizationController } from '../controllers/organizationController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/register-organization', registerOrganizationController);





export default router;