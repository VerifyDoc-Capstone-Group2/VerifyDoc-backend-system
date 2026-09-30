import express from 'express';
import { approveInstitutionController, approveOrganizationController } from '../controllers/adminController.js';
import { authValidation, authorizeAdminRoles } from '../middlewares/authMiddleware.js';


const router = express.Router();


// ====================================
// PATCH
// ====================================
// To approve organization
router.patch('/admin/organizations/:organizationId/approve', authValidation(), authorizeAdminRoles(), approveOrganizationController);


// To approve institution
router.patch('/admin/institutions/:institutionId/approve', authValidation(), authorizeAdminRoles(), approveInstitutionController);


export default router;