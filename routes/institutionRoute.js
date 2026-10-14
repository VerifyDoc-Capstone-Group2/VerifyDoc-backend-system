import express from 'express';
import { Institution } from '../models/institutionModel.js';
import { registerInstitutionController } from '../controllers/institutionController.js';
import { uploadDocument, uploadRegistrationFiles } from '../middlewares/uploadMiddleware.js';
import { parseFormData } from '../middlewares/parseFormData.js';

const router = express.Router();

// Public directory: only approved institutions, and only non-sensitive fields.
router.get('/institutions/search', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2 || q.length > 80) {
      return res.status(400).json({ message: 'Search must contain 2 to 80 characters' });
    }
    const escaped = q.replace(/[^a-zA-Z0-9 ]/g, '\\$&');
    const institutions = await Institution.find({
      status: 'Active',
      institutionName: { $regex: escaped, $options: 'i' }
    }).select('_id institutionName institutionType').sort({ institutionName: 1 }).limit(10).lean();
    res.json({ data: institutions });
  } catch (error) {
    next(error);
  }
});

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