import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { publicVerificationRateLimit } from "../middlewares/publicVerificationRateLimit.js";
import { generateCredentialQRController, verifyCredentialPublicController } from "../controllers/credentialVerificationController.js";

const router = express.Router();
router.get("/credentials/verify/:credentialId", publicVerificationRateLimit, verifyCredentialPublicController);
router.get("/credentials/:credentialId/qr", authValidation(), requireActiveAccount(), generateCredentialQRController);
export default router;
