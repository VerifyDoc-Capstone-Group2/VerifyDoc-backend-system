import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrganizationDashboard } from "../services/organizationDashboardService.js";
import { getOrganizationConfirmation } from "../services/freshConfirmationService.js";

const router = express.Router();

router.get("/organization/dashboard", authValidation(), requireActiveAccount(), asyncHandler(async (req, res) => {
  const data = await getOrganizationDashboard(req.user);
  res.status(200).json({ message: "Organization dashboard retrieved", data });
}));

router.get("/credential-confirmations/organization/:requestId", authValidation(), requireActiveAccount(), asyncHandler(async (req, res) => {
  const data = await getOrganizationConfirmation(req.params.requestId, req.user);
  res.status(200).json({ message: "Confirmation retrieved", data });
}));

export default router;
