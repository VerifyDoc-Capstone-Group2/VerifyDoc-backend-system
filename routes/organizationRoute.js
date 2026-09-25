import express from 'express';
import { createOrganizationController } from '../controllers/organizationController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/', createOrganizationController);




export default router;