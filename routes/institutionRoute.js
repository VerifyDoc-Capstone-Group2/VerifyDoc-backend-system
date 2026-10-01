import express from 'express';
import { registerInstitutionController } from '../controllers/institutionController.js';
import { uploadDocument, uploadRegistrationFiles } from '../middlewares/uploadMiddleware.js';
import { parseFormData } from '../middlewares/parseFormData.js';

const router = express.Router();

// ====================================
// POST
// ====================================
router.post(
  '/auth/register-institution',
  uploadRegistrationFiles.fields([
    { name: 'accreditationDocument', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  parseFormData(['institution', 'user']),
  registerInstitutionController
);


export default router; 