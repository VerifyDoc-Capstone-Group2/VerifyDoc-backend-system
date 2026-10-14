import { CredentialShare } from "../models/credentialShareModel.js";
import { ConfirmationRequest } from "../models/confirmationRequestModel.js";
import { Credential } from "../models/credentialModel.js";
import { Organization } from "../models/organizationModel.js";
import { User } from "../models/userModel.js";
import { AppError } from "../errors/AppError.js";
import mongoose from "mongoose";

export const getOrganizationDashboard = async (identity) => {
  const userId = identity?.userId ?? identity?._id;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const user = await User.findById(userId);
  if (!user || user.role !== "Organization" || user.accountStatus !== "Active" || user.membershipStatus !== "Active") {
    throw new AppError("Active organization membership required", 403);
  }
  const organization = await Organization.findOne({ organizationId: user.organizationId, status: "Active" });
  if (!organization) throw new AppError("Organization is not active", 403);

  const now = new Date();
  const shareFilter = { organization: organization._id, status: "Active", expiresAt: { $gt: now } };
  const confirmationFilter = { organization: organization._id };
  const [shares, pendingRequests, completedRequests, recentShares, recentRequests] = await Promise.all([
    CredentialShare.find(shareFilter).select("credential").lean(),
    ConfirmationRequest.countDocuments({ ...confirmationFilter, status: "Pending" }),
    ConfirmationRequest.countDocuments({ ...confirmationFilter, status: { $in: ["Confirmed", "Disputed"] } }),
    CredentialShare.find(shareFilter).select("credential createdAt").sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
    ConfirmationRequest.find(confirmationFilter).select("status reason createdAt").sort({ createdAt: -1, _id: -1 }).limit(10).lean()
  ]);
  const ids = [...new Set(shares.map(s => String(s.credential)))];
  const credentials = await Credential.find({
    _id: { $in: ids }, status: "Active", verificationStatus: "Verified"
  }).select("_id title issuerName").lean();
  const credentialMap = new Map(credentials.map(c => [String(c._id), c]));
  const activeShares = shares.filter(s => credentialMap.has(String(s.credential))).length;
  const recentActivity = [
    ...recentShares.filter(s => credentialMap.has(String(s.credential))).map(s => ({
      type: "CredentialShared", title: "Credential shared",
      detail: credentialMap.get(String(s.credential))?.title || "Credential",
      status: "Active", createdAt: s.createdAt
    })),
    ...recentRequests.map(r => ({
      type: "FreshConfirmation", title: "Fresh confirmation request",
      detail: r.reason, status: r.status, createdAt: r.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  return {
    organization: {
      organizationName: organization.organizationName,
      organizationType: organization.organizationType,
      status: organization.status
    },
    sharedCredentials: activeShares,
    pendingRequests,
    completedRequests,
    totalVerifications: null,
    recentActivity
  };
};
