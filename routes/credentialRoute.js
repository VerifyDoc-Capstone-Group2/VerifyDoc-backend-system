import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { uploadDocument } from "../middlewares/uploadMiddleware.js";
import {
  createCredentialController, getCredentialByIdController,
  getCitizenCredentialsController, getInstitutionCredentialsController,
  verifyCredentialController, rejectCredentialController, revokeCredentialController
} from "../controllers/credentialController.js";

const router = express.Router();
const authenticate = [authValidation(), requireActiveAccount()];

router.post("/credentials", ...authenticate, uploadDocument.single("document"), createCredentialController);
router.get("/credentials/wallet", ...authenticate, getCitizenCredentialsController);
router.get("/credentials/institution", ...authenticate, getInstitutionCredentialsController);
router.get("/credentials/:credentialId", ...authenticate, getCredentialByIdController);
router.patch("/credentials/:credentialId/verify", ...authenticate, verifyCredentialController);
router.patch("/credentials/:credentialId/reject", ...authenticate, rejectCredentialController);
router.patch("/credentials/:credentialId/revoke", ...authenticate, revokeCredentialController);

export default router;
