import express from 'express';
import { approveOrganizationController } from '../controllers/adminController.js';
import { authValidation } from '../middlewares/authMiddleware.js';


const router = express.Router();


// ====================================
// PATCH
// ====================================
// To approve organization
router.patch('/admin/organizations/:organizationId/approve', authValidation(), approveOrganizationController);



export default router;