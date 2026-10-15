import express from "express";
import { User } from "../models/userModel.js";
import { Institution } from "../models/institutionModel.js";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { uploadDocument } from "../middlewares/uploadMiddleware.js";
import {
  createCredentialController, getCredentialByIdController,
  getCitizenCredentialsController, getInstitutionCredentialsController,
  verifyCredentialController, rejectCredentialController, revokeCredentialController
} from "../controllers/credentialController.js";

const router = express.Router();
const authenticate = [authValidation(), requireActiveAccount()];

// Exact-email recipient lookup; restricted to active institution members.
router.get("/credentials/recipients/lookup", ...authenticate, async (req, res, next) => {
  try {
    const requester = await User.findById(req.user?._id ?? req.user?.userId);
    if (!requester || requester.role !== "Institution" || requester.membershipStatus !== "Active") {
      return res.status(403).json({ message: "Only active institution members may look up recipients" });
    }
    const institution = await Institution.findOne({ institutionId: requester.institutionId, status: "Active" });
    if (!institution) return res.status(403).json({ message: "Institution is not active" });
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: "Enter a valid recipient email" });
    }
    const citizen = await User.findOne({ email, role: "Citizen", accountStatus: "Active" })
      .select("_id firstName lastName email").lean();
    if (!citizen) return res.status(404).json({ message: "No active citizen found with that email" });
    res.json({ message: "Recipient found", data: { citizenId: citizen._id, firstName: citizen.firstName, lastName: citizen.lastName, email: citizen.email } });
  } catch (error) { next(error); }
});

router.post("/credentials", ...authenticate, uploadDocument.single("document"), createCredentialController);
router.get("/credentials/wallet", ...authenticate, getCitizenCredentialsController);
router.get("/credentials/institution", ...authenticate, getInstitutionCredentialsController);
router.get("/credentials/:credentialId", ...authenticate, getCredentialByIdController);
router.patch("/credentials/:credentialId/verify", ...authenticate, verifyCredentialController);
router.patch("/credentials/:credentialId/reject", ...authenticate, rejectCredentialController);
router.patch("/credentials/:credentialId/revoke", ...authenticate, revokeCredentialController);

export default router;
