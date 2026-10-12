import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/userModel.js";
import { Organization } from "../models/organizationModel.js";
import { Institution } from "../models/institutionModel.js";
import { Credential } from "../models/credentialModel.js";
import { CredentialShare } from "../models/credentialShareModel.js";
import { ConfirmationRequest } from "../models/confirmationRequestModel.js";

const actor = async (identity, role) => {
  const id = identity?.userId ?? identity?._id;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Authentication required", 401);
  const user = await User.findById(id);
  if (!user || user.accountStatus !== "Active" || user.role !== role || user.membershipStatus !== "Active") {
    throw new AppError("Active approved membership required", 403);
  }
  return user;
};

const organizationFor = async user => {
  const organization = await Organization.findOne({ organizationId: user.organizationId, status: "Active" });
  if (!organization) throw new AppError("Organization is not active", 403);
  return organization;
};

const institutionFor = async user => {
  const institution = await Institution.findOne({ institutionId: user.institutionId, status: "Active" });
  if (!institution) throw new AppError("Institution is not active", 403);
  return institution;
};

const validId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${label}`, 400);
};

const pagination = options => {
  const parse = (value, fallback) => {
    if (value === undefined) return fallback;
    if (!["string", "number"].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) throw new AppError("Invalid pagination", 400);
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new AppError("Invalid pagination", 400);
    return number;
  };
  const page = parse(options?.page, 1), limit = parse(options?.limit, 10);
  if (limit > 50 || !Number.isSafeInteger((page - 1) * limit)) throw new AppError("Invalid pagination", 400);
  return { page, limit, skip: (page - 1) * limit };
};

const publicFields = "share credential organization institution reason status responseNote requestedBy respondedBy respondedAt createdAt updatedAt";
const visible = request => ({
  id: request._id,
  shareId: request.share,
  credentialId: request.credential,
  organizationId: request.organization,
  institutionId: request.institution,
  reason: request.reason,
  status: request.status,
  responseNote: request.responseNote,
  createdAt: request.createdAt,
  respondedAt: request.respondedAt
});

export const requestFreshConfirmation = async (shareId, reason, identity) => {
  const user = await actor(identity, "Organization");
  const organization = await organizationFor(user);
  validId(shareId, "share ID");
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 500) {
    throw new AppError("Reason must be between 3 and 500 characters", 400);
  }
  const share = await CredentialShare.findOne({
    _id: shareId, organization: organization._id, status: "Active", expiresAt: { $gt: new Date() }
  });
  if (!share) throw new AppError("Active credential share not found", 404);
  const credential = await Credential.findOne({
    _id: share.credential, citizenId: share.citizen, status: "Active", verificationStatus: "Verified"
  });
  if (!credential) throw new AppError("Credential is no longer available for confirmation", 403);
  if (!credential.institution) throw new AppError("Credential has no registered issuing Institution", 409);
  const institution = await Institution.findById(credential.institution);
  if (!institution || institution.status !== "Active") throw new AppError("Issuing Institution is not active", 409);

  const existing = await ConfirmationRequest.findOne({ share: share._id, status: "Pending" });
  if (existing) throw new AppError("A confirmation request is already pending for this share", 409);

  try {
    const request = await ConfirmationRequest.create({
      share: share._id, credential: credential._id, organization: organization._id,
      institution: institution._id, requestedBy: user._id, reason: reason.trim()
    });
    return visible(request);
  } catch (error) {
    if (error.code === 11000) throw new AppError("A confirmation request is already pending for this share", 409);
    throw error;
  }
};

export const listOrganizationConfirmations = async (identity, options = {}) => {
  const user = await actor(identity, "Organization");
  const organization = await organizationFor(user);
  return listRequests({ organization: organization._id }, options);
};

export const listInstitutionConfirmations = async (identity, options = {}) => {
  const user = await actor(identity, "Institution");
  const institution = await institutionFor(user);
  return listRequests({ institution: institution._id }, options);
};

const listRequests = async (scope, options) => {
  const { page, limit, skip } = pagination(options);
  const filter = { ...scope };
  if (options.status !== undefined) {
    if (!["Pending", "Confirmed", "Disputed"].includes(options.status)) throw new AppError("Invalid confirmation status", 400);
    filter.status = options.status;
  }
  const [total, requests] = await Promise.all([
    ConfirmationRequest.countDocuments(filter),
    ConfirmationRequest.find(filter).select(publicFields).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean()
  ]);
  return { requests: requests.map(visible), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const respondToFreshConfirmation = async (requestId, data, identity) => {
  const user = await actor(identity, "Institution");
  const institution = await institutionFor(user);
  validId(requestId, "confirmation request ID");
  const decision = data?.decision;
  if (!["Confirmed", "Disputed"].includes(decision)) throw new AppError("Decision must be Confirmed or Disputed", 400);
  const responseNote = data?.responseNote;
  if (responseNote !== undefined && (typeof responseNote !== "string" || responseNote.trim().length > 1000)) {
    throw new AppError("Invalid response note", 400);
  }
  if (decision === "Disputed" && (!responseNote || responseNote.trim().length < 3)) {
    throw new AppError("A reason is required to dispute a credential", 400);
  }
  const request = await ConfirmationRequest.findOne({ _id: requestId, institution: institution._id, status: "Pending" });
  if (!request) throw new AppError("Pending confirmation request not found", 404);
  const [share, credential] = await Promise.all([
    CredentialShare.findOne({ _id: request.share, status: "Active", expiresAt: { $gt: new Date() } }),
    Credential.findOne({ _id: request.credential, institution: institution._id, status: "Active", verificationStatus: "Verified" })
  ]);
  if (!share || !credential || String(share.credential) !== String(credential._id) ||
      String(share.organization) !== String(request.organization)) {
    throw new AppError("The credential share is no longer eligible for confirmation", 409);
  }
  const updated = await ConfirmationRequest.findOneAndUpdate(
    { _id: requestId, institution: institution._id, status: "Pending" },
    { $set: { status: decision, responseNote: responseNote?.trim(), respondedBy: user._id, respondedAt: new Date() } },
    { new: true }
  );
  if (!updated) throw new AppError("Request has already been answered", 409);
  // This response is a confirmation result, not a mutation of the issued credential.
  return visible(updated);
};
