import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/userModel.js";
import { Credential } from "../models/credentialModel.js";
import { Organization } from "../models/organizationModel.js";
import { CredentialShare } from "../models/credentialShareModel.js";

const ID_PATTERN = /^VDOC-CRED-\d{8}$/;
const MAX_SHARING_DAYS = 365;
const SUMMARY_FIELDS = "credentialId issuerName credentialType title issueDate graduationYear verificationStatus status";
const toId = (value) => value?._id ?? value?.userId;

const authenticatedUser = async (identity, role) => {
  const id = toId(identity);
  if (!mongoose.isValidObjectId(id)) throw new AppError("Authentication required", 401);
  const user = await User.findById(id);
  if (!user || user.accountStatus !== "Active") throw new AppError("Active account required", 403);
  if (user.role !== role) throw new AppError(`${role} access required`, 403);
  return user;
};

const activeOrganization = async (organizationId) => {
  if (!mongoose.isValidObjectId(organizationId)) throw new AppError("Invalid organization ID", 400);
  const organization = await Organization.findById(organizationId);
  if (!organization || organization.status !== "Active") {
    throw new AppError("An approved, active organization is required", 403);
  }
  return organization;
};

const organizationForUser = async (identity) => {
  const user = await authenticatedUser(identity, "Organization");
  if (user.membershipStatus !== "Active") throw new AppError("Organization membership is not active", 403);
  const organization = await Organization.findOne({ organizationId: user.organizationId });
  if (!organization || organization.status !== "Active") throw new AppError("Organization is not active", 403);
  return organization;
};

const parseExpiry = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new AppError("expiresAt must be an ISO UTC timestamp", 400);
  }
  const expiry = new Date(value);
  const now = Date.now();
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now ||
      expiry.getTime() > now + MAX_SHARING_DAYS * 24 * 60 * 60 * 1000) {
    throw new AppError("expiresAt must be in the future and within 365 days", 400);
  }
  return expiry;
};

const parsePagination = (options = {}) => {
  const number = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" && typeof value !== "number") throw new AppError("Invalid pagination", 400);
    if (!/^[1-9]\d*$/.test(String(value))) throw new AppError("Invalid pagination", 400);
    const n = Number(value);
    if (!Number.isSafeInteger(n)) throw new AppError("Invalid pagination", 400);
    return n;
  };
  const page = number(options.page, 1);
  const limit = number(options.limit, 10);
  if (limit > 50 || !Number.isSafeInteger((page - 1) * limit)) throw new AppError("Invalid pagination", 400);
  return { page, limit, skip: (page - 1) * limit };
};

const effectiveStatus = (share, credential, organization, now = new Date()) => {
  if (share.status === "Revoked") return "Revoked";
  if (share.expiresAt <= now) return "Expired";
  if (!organization || organization.status !== "Active") return "Unavailable";
  if (!credential || credential.status !== "Active" || credential.verificationStatus !== "Verified") return "Unavailable";
  return "Active";
};

const summary = (share, credential, organization) => ({
  shareId: share._id,
  credential: credential ? {
    credentialId: credential.credentialId,
    issuerName: credential.issuerName,
    credentialType: credential.credentialType,
    title: credential.title,
    issueDate: credential.issueDate,
    graduationYear: credential.graduationYear,
    verificationStatus: credential.verificationStatus,
    status: credential.status
  } : null,
  organization: organization ? { id: organization._id, name: organization.organizationName } : null,
  purpose: share.purpose,
  expiresAt: share.expiresAt,
  status: effectiveStatus(share, credential, organization),
  createdAt: share.createdAt,
  revokedAt: share.revokedAt
});

export const listEligibleOrganizations = async (identity, options = {}) => {
  await authenticatedUser(identity, "Citizen");
  const { page, limit, skip } = parsePagination(options);
  const filter = { status: "Active" };
  const [total, organizations] = await Promise.all([
    Organization.countDocuments(filter),
    Organization.find(filter).select("organizationName organizationType organizationId").sort({ organizationName: 1, _id: 1 }).skip(skip).limit(limit).lean()
  ]);
  return { organizations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const createCredentialShare = async (data, identity) => {
  const citizen = await authenticatedUser(identity, "Citizen");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AppError("Invalid share details", 400);
  const { credentialId, organizationId, purpose, expiresAt } = data;
  if (typeof credentialId !== "string" || !ID_PATTERN.test(credentialId)) throw new AppError("Invalid credential ID", 400);
  if (typeof purpose !== "string" || purpose.trim().length < 3 || purpose.trim().length > 500) {
    throw new AppError("Purpose must be between 3 and 500 characters", 400);
  }
  const expiry = parseExpiry(expiresAt);
  const credential = await Credential.findOne({ credentialId, citizenId: citizen._id });
  if (!credential) throw new AppError("Credential not found in your wallet", 404);
  if (credential.status !== "Active" || credential.verificationStatus !== "Verified") {
    throw new AppError("Only active, verified credentials can be shared", 409);
  }
  const organization = await activeOrganization(organizationId);
  return CredentialShare.create({
    credential: credential._id, citizen: citizen._id,
    organization: organization._id, purpose: purpose.trim(), expiresAt: expiry
  });
};

export const getCitizenShares = async (identity, options = {}) => {
  const citizen = await authenticatedUser(identity, "Citizen");
  const { page, limit, skip } = parsePagination(options);
  const filter = { citizen: citizen._id };
  const [total, shares] = await Promise.all([
    CredentialShare.countDocuments(filter),
    CredentialShare.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean()
  ]);
  const credentialIds = shares.map(s => s.credential);
  const organizationIds = shares.map(s => s.organization);
  const [credentials, organizations] = await Promise.all([
    Credential.find({ _id: { $in: credentialIds } }).select(SUMMARY_FIELDS).lean(),
    Organization.find({ _id: { $in: organizationIds } }).select("organizationName status").lean()
  ]);
  const credentialMap = new Map(credentials.map(c => [String(c._id), c]));
  const organizationMap = new Map(organizations.map(o => [String(o._id), o]));
  return {
    shares: shares.map(s => summary(s, credentialMap.get(String(s.credential)), organizationMap.get(String(s.organization)))),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const revokeCredentialShare = async (shareId, identity) => {
  const citizen = await authenticatedUser(identity, "Citizen");
  if (!mongoose.isValidObjectId(shareId)) throw new AppError("Invalid share ID", 400);
  const share = await CredentialShare.findOneAndUpdate(
    { _id: shareId, citizen: citizen._id, status: "Active" },
    { $set: { status: "Revoked", revokedAt: new Date() } },
    { new: true }
  );
  if (!share) throw new AppError("Active share not found", 404);
  return { shareId: share._id, status: "Revoked", revokedAt: share.revokedAt };
};

export const getOrganizationShares = async (identity, options = {}) => {
  const organization = await organizationForUser(identity);
  const { page, limit, skip } = parsePagination(options);
  const filter = { organization: organization._id, status: "Active", expiresAt: { $gt: new Date() } };
  const shares = await CredentialShare.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean();
  const credentials = await Credential.find({ _id: { $in: shares.map(s => s.credential) }, status: "Active", verificationStatus: "Verified" }).select(SUMMARY_FIELDS).lean();
  const credentialMap = new Map(credentials.map(c => [String(c._id), c]));
  const accessible = shares.filter(s => credentialMap.has(String(s.credential)));
  return { shares: accessible.map(s => summary(s, credentialMap.get(String(s.credential)), organization)), pagination: { page, limit, returned: accessible.length } };
};

export const getOrganizationSharedCredential = async (shareId, identity) => {
  const organization = await organizationForUser(identity);
  if (!mongoose.isValidObjectId(shareId)) throw new AppError("Invalid share ID", 400);
  const share = await CredentialShare.findOne({ _id: shareId, organization: organization._id, status: "Active", expiresAt: { $gt: new Date() } }).lean();
  if (!share) throw new AppError("Active share not found", 404);
  const credential = await Credential.findOne({ _id: share.credential, citizenId: share.citizen, status: "Active", verificationStatus: "Verified" }).select(SUMMARY_FIELDS).lean();
  if (!credential) throw new AppError("Shared credential is no longer available", 403);
  return summary(share, credential, organization);
};
