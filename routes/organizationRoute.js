import express from 'express';
import { createOrganizationController, registerOrganizationController } from '../controllers/organizationController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/', registerOrganizationController);
router.post('/', createOrganizationController);




export default router;