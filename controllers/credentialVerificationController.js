import { asyncHandler } from "../utils/asyncHandler.js";
import { getCredentialVerification } from "../services/credentialVerificationService.js";
import { generateCredentialQRCode } from "../services/credentialQRCodeService.js";
import { Credential } from "../models/credentialModel.js";
import { AppError } from "../errors/AppError.js";
import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { Institution } from "../models/institutionModel.js";

export const verifyCredentialPublicController = asyncHandler(async (req, res) => {
  const data = await getCredentialVerification(req.params.credentialId, req.query.token);
  res.status(200).json({ message: "Credential verification result", data });
});

export const generateCredentialQRController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?._id;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const currentUser = await User.findById(userId);
  if (!currentUser || currentUser.accountStatus !== "Active") throw new AppError("Account not active", 403);
  const credentialId = req.params.credentialId;
  if (!/^VDOC-CRED-[0-9]{8}$/.test(credentialId)) throw new AppError("Invalid credential ID", 400);
  const credential = await Credential.findOne({ credentialId }).select("citizenId institution");
  if (!credential) throw new AppError("Credential not found", 404);
  if (currentUser.role === "Citizen") {
    if (!credential.citizenId?.equals(currentUser._id)) throw new AppError("Not authorized", 403);
  } else if (currentUser.role === "Institution") {
    if (currentUser.membershipStatus !== "Active") throw new AppError("Not authorized", 403);
    const institution = await Institution.findOne({ institutionId: currentUser.institutionId, status: "Active" });
    if (!institution || !credential.institution?.equals(institution._id)) throw new AppError("Not authorized", 403);
  } else {
    throw new AppError("Not authorized", 403);
  }
  const data = await generateCredentialQRCode(credentialId);
  res.status(200).json({ message: "QR code generated", data });
});
