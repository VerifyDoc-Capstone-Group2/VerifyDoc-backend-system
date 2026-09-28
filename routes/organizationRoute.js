import express from 'express';
import { registerOrganizationController } from '../controllers/organizationController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/', registerOrganizationController);





export default router;