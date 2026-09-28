import express from 'express';
import { registerInstitutionController } from '../controllers/institutionController.js';

const router = express.Router();

// ====================================
// POST
// ====================================
router.post('/', registerInstitutionController);



export default router;