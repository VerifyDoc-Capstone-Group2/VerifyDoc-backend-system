import express from 'express';
import { approveInstitutionController, approveOrganizationController, rejectInstitutionController, rejectOrganizationController, pendingOrganizationsController, pendingInstitutionsController, approvalQueueController, getUsersController, getAdminDashboardController, getAdminEntityDirectoryController } from '../controllers/adminController.js';
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

// To get all user
router.get(
  '/admin/users',
  authValidation(),
  authorizeAdminRoles(),
  getUsersController
);

// To get dashboard data
router.get(
  '/admin/dashboard',
  authValidation(),
  authorizeAdminRoles(),
  getAdminDashboardController
);


// List all registered organizations and institutions for the admin directory.
router.get('/admin/entities', authValidation(), authorizeAdminRoles(), getAdminEntityDirectoryController);

export default router;