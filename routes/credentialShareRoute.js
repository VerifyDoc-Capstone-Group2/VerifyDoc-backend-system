import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import {
  listEligibleOrganizationsController,
  createCredentialShareController,
  getCitizenSharesController,
  revokeCredentialShareController,
  getOrganizationSharesController,
  getOrganizationSharedCredentialController
} from "../controllers/credentialShareController.js";

const router = express.Router();
const authenticate = [authValidation(), requireActiveAccount()];

router.get("/credential-shares/eligible-organizations", ...authenticate, listEligibleOrganizationsController);
router.post("/credential-shares", ...authenticate, createCredentialShareController);
router.get("/credential-shares/mine", ...authenticate, getCitizenSharesController);
router.patch("/credential-shares/:shareId/revoke", ...authenticate, revokeCredentialShareController);
router.get("/credential-shares/organization", ...authenticate, getOrganizationSharesController);
router.get("/credential-shares/organization/:shareId", ...authenticate, getOrganizationSharedCredentialController);

export default router;
