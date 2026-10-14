import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/userModel.js";
import { Credential } from "../models/credentialModel.js";
import { CredentialShare } from "../models/credentialShareModel.js";
import { Organization } from "../models/organizationModel.js";

export const getCitizenDashboard = async (identity) => {
  const userId = identity?.userId ?? identity?._id;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const citizen = await User.findById(userId).select("role accountStatus").lean();
  if (!citizen || citizen.role !== "Citizen" || citizen.accountStatus !== "Active") {
    throw new AppError("Active Citizen account required", 403);
  }

  const filter = { citizenId: citizen._id };
  const shareFilter = { citizen: citizen._id };
  const now = new Date();

  const [
    totalCredentials, verifiedCredentials, pendingCredentials, rejectedCredentials,
    revokedCredentials, sharedCredentials, activeShareCandidates, recentCredentials, recentShareRecords
  ] = await Promise.all([
    Credential.countDocuments(filter),
    Credential.countDocuments({ ...filter, verificationStatus: "Verified", status: "Active" }),
    Credential.countDocuments({ ...filter, verificationStatus: "Pending", status: "Active" }),
    Credential.countDocuments({ ...filter, verificationStatus: "Rejected", status: "Active" }),
    Credential.countDocuments({ ...filter, status: "Revoked" }),
    CredentialShare.countDocuments(shareFilter),
    CredentialShare.find({ ...shareFilter, status: "Active", expiresAt: { $gt: now } })
      .select("credential organization expiresAt").lean(),
    Credential.find(filter).select("credentialId title verificationStatus status createdAt verifiedAt revokedAt")
      .sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
    CredentialShare.find(shareFilter).select("credential organization status expiresAt createdAt revokedAt")
      .sort({ createdAt: -1, _id: -1 }).limit(10).lean()
  ]);

  const credentialIds = [...new Set([
    ...recentShareRecords.map(share => String(share.credential)),
    ...activeShareCandidates.map(share => String(share.credential))
  ])];
  const organizationIds = [...new Set([
    ...recentShareRecords.map(share => String(share.organization)),
    ...activeShareCandidates.map(share => String(share.organization))
  ])];
  const [credentials, organizations] = await Promise.all([
    Credential.find({ _id: { $in: credentialIds }, citizenId: citizen._id })
      .select("_id credentialId title status verificationStatus").lean(),
    Organization.find({ _id: { $in: organizationIds } })
      .select("_id organizationName status").lean()
  ]);
  const credentialMap = new Map(credentials.map(item => [String(item._id), item]));
  const organizationMap = new Map(organizations.map(item => [String(item._id), item]));

  const activeShares = activeShareCandidates.filter(share => {
    const credential = credentialMap.get(String(share.credential));
    const organization = organizationMap.get(String(share.organization));
    return credential?.status === "Active" && credential?.verificationStatus === "Verified" &&
      organization?.status === "Active";
  }).length;

  const recentShares = recentShareRecords.slice(0, 5).map(share => {
    const credential = credentialMap.get(String(share.credential));
    const organization = organizationMap.get(String(share.organization));
    let status = share.status === "Revoked" ? "Revoked" :
      new Date(share.expiresAt) <= now ? "Expired" :
      !credential || credential.status !== "Active" || credential.verificationStatus !== "Verified" ||
      !organization || organization.status !== "Active" ? "Unavailable" : "Active";
    return {
      shareId: share._id,
      organizationName: organization?.organizationName ?? null,
      credentialId: credential?.credentialId ?? null,
      credentialTitle: credential?.title ?? null,
      status,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt
    };
  });

  const recentActivity = [
    ...recentCredentials.map(item => ({
      type: "CredentialAdded",
      title: "Credential added",
      detail: item.title,
      credentialId: item.credentialId,
      status: item.verificationStatus,
      createdAt: item.createdAt
    })),
    ...recentCredentials.filter(item => item.verifiedAt).map(item => ({
      type: "CredentialVerified",
      title: "Credential verified",
      detail: item.title,
      credentialId: item.credentialId,
      status: item.verificationStatus,
      createdAt: item.verifiedAt
    })),
    ...recentShareRecords.map(share => ({
      type: "CredentialShared",
      title: "Credential shared",
      detail: organizationMap.get(String(share.organization))?.organizationName ?? "Organization",
      credentialId: credentialMap.get(String(share.credential))?.credentialId ?? null,
      status: share.status,
      createdAt: share.createdAt
    }))
  ].filter(item => item.createdAt).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return {
    totalCredentials,
    verifiedCredentials,
    pendingCredentials,
    rejectedCredentials,
    revokedCredentials,
    expiredCredentials: null,
    sharedCredentials,
    activeShares,
    recentActivity,
    recentShares
  };
};
