import express from "express";
import { authValidation, requireActiveAccount } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCitizenDashboard } from "../services/citizenDashboardService.js";

const router = express.Router();

router.get("/citizen/dashboard", authValidation(), requireActiveAccount(), asyncHandler(async (req, res) => {
  const data = await getCitizenDashboard(req.user);
  res.status(200).json({ message: "Citizen dashboard retrieved", data });
}));

export default router;
