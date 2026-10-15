import express from 'express';
import { User } from '../models/userModel.js';
import { authValidation, requireActiveAccount } from '../middlewares/authMiddleware.js';
import { Institution } from '../models/institutionModel.js';
import { registerInstitutionController } from '../controllers/institutionController.js';
import { uploadDocument, uploadRegistrationFiles } from '../middlewares/uploadMiddleware.js';
import { parseFormData } from '../middlewares/parseFormData.js';

const router = express.Router();

// Authenticated institution identity for dashboard branding.
router.get('/institutions/me', authValidation(), requireActiveAccount(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id ?? req.user?.userId)
      .select('role institutionId').lean();
    if (!user || user.role !== 'Institution' || !user.institutionId) {
      return res.status(403).json({ message: 'Institution account required' });
    }
    const institution = await Institution.findOne({ institutionId: user.institutionId })
      .select('institutionId institutionName institutionType status').lean();
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    return res.json({ message: 'Institution retrieved', data: institution });
  } catch (error) { next(error); }
});

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