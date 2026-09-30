import express from 'express';
import { approveInstitutionController, approveOrganizationController, rejectInstitutionController, rejectOrganizationController } from '../controllers/adminController.js';
import { authValidation, authorizeAdminRoles } from '../middlewares/authMiddleware.js';


const router = express.Router();


// ====================================
// PATCH
// ====================================
// To approve organization
router.patch('/admin/organizations/:organizationId/approve', authValidation(), authorizeAdminRoles(), approveOrganizationController);


// To reject organization
router.patch('/admin/organizations/:organizationId/reject', authValidation(), authorizeAdminRoles(), rejectOrganizationController);


// To approve institution
router.patch('/admin/institutions/:institutionId/approve', authValidation(), authorizeAdminRoles(), approveInstitutionController);


// To reject institution
router.patch('/admin/institutions/:institutionId/reject', authValidation(), authorizeAdminRoles(), rejectInstitutionController);


export default router;