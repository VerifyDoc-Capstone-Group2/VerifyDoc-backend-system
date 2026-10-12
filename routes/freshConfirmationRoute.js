import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import {
  requestFreshConfirmationController, listOrganizationConfirmationsController,
  listInstitutionConfirmationsController, respondToFreshConfirmationController
} from "../controllers/freshConfirmationController.js";

const router = express.Router();
const authenticate = [authValidation(), requireActiveAccount()];

router.post("/credential-shares/organization/:shareId/confirmations", ...authenticate, requestFreshConfirmationController);
router.get("/credential-confirmations/organization", ...authenticate, listOrganizationConfirmationsController);
router.get("/credential-confirmations/institution", ...authenticate, listInstitutionConfirmationsController);
router.patch("/credential-confirmations/institution/:requestId/respond", ...authenticate, respondToFreshConfirmationController);

export default router;
