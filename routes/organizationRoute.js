import express from 'express';
import { uploadDocument, uploadRegistrationFiles } from '../middlewares/uploadMiddleware.js';
import { parseFormData } from '../middlewares/parseFormData.js';
import { registerOrganizationController } from '../controllers/organizationController.js';


const router = express.Router();

// ====================================
// POST
// ====================================
router.post(
  '/auth/register-organization',
  uploadRegistrationFiles.fields([
    { name: 'cacCertificate', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  parseFormData(['organization', 'user']),
  registerOrganizationController
);





export default router;