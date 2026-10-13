import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrganizationDashboard } from "../services/organizationDashboardService.js";

const router = express.Router();

router.get("/organization/dashboard", authValidation(), requireActiveAccount(), asyncHandler(async (req, res) => {
  const data = await getOrganizationDashboard(req.user);
  res.status(200).json({ message: "Organization dashboard retrieved", data });
}));

export default router;
