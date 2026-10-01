import express from 'express';
import { approveInstitutionController, approveOrganizationController, rejectInstitutionController, rejectOrganizationController, pendingOrganizationsController, pendingInstitutionsController, approvalQueueController } from '../controllers/adminController.js';
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


// ====================================
// GET
// ====================================
// To get pending organizations
router.get(
  '/admin/organizations/pending',
  authValidation(),
  authorizeAdminRoles(),
  pendingOrganizationsController
);


// To get pending institutions
router.get(
  '/admin/institutions/pending',
  authValidation(),
  authorizeAdminRoles(),
  pendingInstitutionsController
);

// To get approval queue
router.get ('/admin/approval-queue', authValidation(), authorizeAdminRoles(), approvalQueueController);


export default router;