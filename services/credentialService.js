import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { Credential } from "../models/credentialModel.js";
import { AppError } from "../errors/AppError.js";
import { User } from "../models/userModel.js";
import { Institution } from "../models/institutionModel.js";

const MAX_ID_ATTEMPTS = 5;

const requireText = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return value.trim();
};

const parseIssueDate = (value) => {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new AppError("Invalid issueDate", 400);
  }
  // Avoid accepting ambiguous dates such as 02/03/2026.
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    throw new AppError("issueDate must be an ISO date", 400);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date > new Date()) {
    throw new AppError("issueDate must be a valid date that is not in the future", 400);
  }
  if (date.getUTCFullYear() < 1900) {
    throw new AppError("issueDate is too old", 400);
  }
  return date;
};

const parseGraduationYear = (value) => {
  if (value === undefined) return undefined;
  const year = typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
    throw new AppError("Invalid graduationYear", 400);
  }
  return year;
};

const validateUploadedDocument = (document) => {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new AppError("A document upload is required", 400);
  }
  const url = requireText(document.url, "document URL");
  const publicId = requireText(document.publicId, "document publicId");
  if (!/^https:\/\//i.test(url)) {
    throw new AppError("Document URL must use HTTPS", 400);
  }
  return { url, publicId };
};

const saveWithUniqueCredentialId = async (data) => {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const credentialId = `VDOC-CRED-${randomInt(10000000, 100000000)}`;
    try {
      return await Credential.create({ ...data, credentialId });
    } catch (error) {
      // Only retry collisions on the generated credentialId, not unrelated unique fields.
      if (error.code === 11000 && (error.keyPattern?.credentialId || error.keyValue?.credentialId)) {
        continue;
      }
      throw error;
    }
  }
  throw new AppError("Unable to generate a unique credential ID. Please try again.", 503);
};

export const createCredential = async (credentialData, user) => {
  if (!credentialData || typeof credentialData !== "object" || Array.isArray(credentialData)) {
    throw new AppError("Invalid credential data", 400);
  }

  // Never trust a role or account status supplied in the request body.
  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Authentication required", 401);
  }
  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError("User not found", 404);
  if (currentUser.accountStatus !== "Active") {
    throw new AppError("User account is not active", 403);
  }
  if (!["Institution", "Citizen"].includes(currentUser.role)) {
    throw new AppError("You are not authorized to create credentials", 403);
  }

  const {
    citizenId, institution, issuerName, credentialType, title,
    fieldOfStudy, issueDate, graduationYear, document
  } = credentialData;

  const common = {
    credentialType: requireText(credentialType, "credentialType"),
    title: requireText(title, "title"),
    fieldOfStudy: fieldOfStudy === undefined ? undefined : requireText(fieldOfStudy, "fieldOfStudy"),
    issueDate: parseIssueDate(issueDate),
    graduationYear: parseGraduationYear(graduationYear),
    document: validateUploadedDocument(document),
    createdByUserId: currentUser._id
  };

  if (currentUser.role === "Institution") {
    if (issuerName !== undefined || institution !== undefined) {
      throw new AppError("The issuer is determined from your Institution account", 400);
    }
    if (!mongoose.isValidObjectId(citizenId)) {
      throw new AppError("Invalid citizen ID", 400);
    }
    const existingInstitution = await Institution.findOne({
      institutionId: currentUser.institutionId
    });
    if (!existingInstitution) {
      throw new AppError("Institution associated with this user was not found", 404);
    }
    if (existingInstitution.status !== "Active" || currentUser.membershipStatus !== "Active") {
      throw new AppError("Institution is not active", 403);
    }
    const citizen = await User.findById(citizenId);
    if (!citizen) throw new AppError("Citizen not found", 404);
    if (citizen.role !== "Citizen") {
      throw new AppError("The provided user is not a citizen", 400);
    }

    return saveWithUniqueCredentialId({
      ...common,
      citizenId: citizen._id,
      institution: existingInstitution._id,
      issuerName: existingInstitution.institutionName,
      source: "Institution",
      verificationStatus: "Verified",
      status: "Active",
      verifiedByInstitutionUserId: currentUser._id,
      verifiedAt: new Date()
    });
  }

  // Citizens can upload credentials from registered or unregistered issuers.
  if (citizenId !== undefined) {
    throw new AppError("Citizens can only upload credentials to their own wallet", 400);
  }
  let existingInstitution;
  let finalIssuerName;
  if (institution === undefined) {
    finalIssuerName = requireText(issuerName, "issuerName");
  } else {
    if (issuerName !== undefined) {
      throw new AppError("Do not provide issuerName when an institution is selected", 400);
    }
    if (!mongoose.isValidObjectId(institution)) {
      throw new AppError("Invalid institution ID", 400);
    }
    existingInstitution = await Institution.findById(institution);
    if (!existingInstitution) throw new AppError("Institution not found", 404);
    if (existingInstitution.status !== "Active") {
      throw new AppError("Institution is not active", 403);
    }
    finalIssuerName = existingInstitution.institutionName;
  }

  return saveWithUniqueCredentialId({
    ...common,
    citizenId: currentUser._id,
    institution: existingInstitution?._id,
    issuerName: finalIssuerName,
    source: "Citizen",
    verificationStatus: "Pending",
    status: "Active"
  });
};


// Retrieve full credential details only for the wallet owner or associated issuer.
// Public QR verification must use a separate, privacy-limited service.
export const getCredentialById = async (credentialId, user) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-\d{8}$/.test(credentialId.trim())) {
    throw new AppError("Invalid credential ID", 400);
  }

  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Authentication required", 401);
  }

  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new AppError("User not found", 404);
  }
  if (currentUser.accountStatus !== "Active") {
    throw new AppError("User account is not active", 403);
  }

  const credential = await Credential.findOne({
    credentialId: credentialId.trim()
  });
  if (!credential) {
    throw new AppError("Credential not found", 404);
  }

  if (currentUser.role === "Citizen") {
    if (!credential.citizenId?.equals(currentUser._id)) {
      throw new AppError("You are not authorized to access this credential", 403);
    }
    return credential;
  }

  if (currentUser.role === "Institution") {
    if (currentUser.membershipStatus !== "Active") {
      throw new AppError("Institution membership is not active", 403);
    }
    const existingInstitution = await Institution.findOne({
      institutionId: currentUser.institutionId
    });
    if (!existingInstitution || existingInstitution.status !== "Active") {
      throw new AppError("Institution is not active", 403);
    }
    if (!credential.institution?.equals(existingInstitution._id)) {
      throw new AppError("You are not authorized to access this credential", 403);
    }
    return credential;
  }

  // Organizations will receive limited verification results through a
  // dedicated verification service, not private credential documents.
  throw new AppError("You are not authorized to access this credential", 403);
};


// Citizen wallet listing: summaries only, including Pending/Rejected/Revoked records.
export const getCitizenCredentials = async (user, options = {}) => {
  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Authentication required", 401);
  }

  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throw new AppError("User not found", 404);
  }
  if (currentUser.accountStatus !== "Active") {
    throw new AppError("User account is not active", 403);
  }
  if (currentUser.role !== "Citizen") {
    throw new AppError("Only Citizens can access a Citizen wallet", 403);
  }

  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new AppError("Invalid wallet query options", 400);
  }

  const parsePositiveInteger = (value, fallback, name) => {
    if (value === undefined) return fallback;
    if (typeof value !== "number" && typeof value !== "string") {
      throw new AppError(`Invalid ${name}`, 400);
    }
    const normalized = String(value);
    if (!/^[1-9]\d*$/.test(normalized)) {
      throw new AppError(`Invalid ${name}`, 400);
    }
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed)) {
      throw new AppError(`Invalid ${name}`, 400);
    }
    return parsed;
  };

  const page = parsePositiveInteger(options.page, 1, "page");
  const limit = parsePositiveInteger(options.limit, 10, "limit");
  if (limit > 50) {
    throw new AppError("Wallet page limit cannot exceed 50", 400);
  }
  if ((page - 1) * limit > Number.MAX_SAFE_INTEGER) {
    throw new AppError("Page is too large", 400);
  }

  const filter = { citizenId: currentUser._id };
  if (options.verificationStatus !== undefined) {
    if (!["Pending", "Verified", "Rejected"].includes(options.verificationStatus)) {
      throw new AppError("Invalid verificationStatus filter", 400);
    }
    filter.verificationStatus = options.verificationStatus;
  }
  if (options.status !== undefined) {
    if (!["Active", "Revoked"].includes(options.status)) {
      throw new AppError("Invalid status filter", 400);
    }
    filter.status = options.status;
  }
  if (options.source !== undefined) {
    if (!["Citizen", "Institution"].includes(options.source)) {
      throw new AppError("Invalid source filter", 400);
    }
    filter.source = options.source;
  }

  const [total, credentials] = await Promise.all([
    Credential.countDocuments(filter),
    Credential.find(filter)
      .select("credentialId issuerName credentialType title fieldOfStudy issueDate graduationYear source verificationStatus status createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
  ]);

  return {
    credentials,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};


export const getInstitutionCredentials = async (user, options = {}) => {
  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError("User not found", 404);
  if (currentUser.accountStatus !== "Active") throw new AppError("User account is not active", 403);
  if (currentUser.role !== "Institution") throw new AppError("Institution access required", 403);
  if (currentUser.membershipStatus !== "Active") throw new AppError("Institution membership is not active", 403);

  const institution = await Institution.findOne({ institutionId: currentUser.institutionId });
  if (!institution || institution.status !== "Active") throw new AppError("Institution is not active", 403);
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new AppError("Invalid options", 400);

  const parsePageNumber = (value, fallback) => {
    if (value === undefined) return fallback;
    if (!["number", "string"].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value))) {
      throw new AppError("Invalid pagination value", 400);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) throw new AppError("Invalid pagination value", 400);
    return parsed;
  };
  const page = parsePageNumber(options.page, 1);
  const limit = parsePageNumber(options.limit, 10);
  if (limit > 50) throw new AppError("Maximum page size is 50", 400);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new AppError("Page is too large", 400);

  const view = options.view ?? "all";
  if (!["all", "issued", "uploaded", "pendingReview"].includes(view)) {
    throw new AppError("Invalid view", 400);
  }
  const filter = { institution: institution._id };
  if (view === "issued") filter.source = "Institution";
  if (view === "uploaded" || view === "pendingReview") filter.source = "Citizen";
  if (view === "pendingReview") {
    filter.verificationStatus = "Pending";
    filter.status = "Active";
  }
  if (options.verificationStatus !== undefined) {
    if (!["Pending", "Verified", "Rejected"].includes(options.verificationStatus)) {
      throw new AppError("Invalid verificationStatus", 400);
    }
    if (view === "pendingReview" && options.verificationStatus !== "Pending") {
      throw new AppError("Conflicting verificationStatus filter", 400);
    }
    filter.verificationStatus = options.verificationStatus;
  }
  if (options.status !== undefined) {
    if (!["Active", "Revoked"].includes(options.status)) throw new AppError("Invalid status", 400);
    if (view === "pendingReview" && options.status !== "Active") {
      throw new AppError("Conflicting status filter", 400);
    }
    filter.status = options.status;
  }

  const [total, credentials] = await Promise.all([
    Credential.countDocuments(filter),
    Credential.find(filter)
      .select("credentialId citizenId issuerName credentialType title fieldOfStudy issueDate graduationYear source verificationStatus status createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  return { credentials, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};


export const verifyCredential = async (credentialId, user) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-[0-9]{8}$/.test(credentialId.trim())) {
    throw new AppError("Invalid credential ID", 400);
  }
  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);

  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError("User not found", 404);
  if (currentUser.accountStatus !== "Active") throw new AppError("User account is not active", 403);
  if (currentUser.role !== "Institution") throw new AppError("Institution access required", 403);
  if (currentUser.membershipStatus !== "Active") throw new AppError("Institution membership is not active", 403);

  const institution = await Institution.findOne({ institutionId: currentUser.institutionId });
  if (!institution || institution.status !== "Active") throw new AppError("Institution is not active", 403);

  const credential = await Credential.findOne({ credentialId: credentialId.trim() })
    .select("institution source verificationStatus status");
  if (!credential) throw new AppError("Credential not found", 404);
  if (!credential.institution?.equals(institution._id)) {
    throw new AppError("You are not authorized to verify this credential", 403);
  }
  if (credential.source !== "Citizen") {
    throw new AppError("Only Citizen-uploaded credentials require review", 409);
  }
  if (credential.status !== "Active" || credential.verificationStatus !== "Pending") {
    throw new AppError("Only active, pending credentials can be verified", 409);
  }

  // Atomic conditional update prevents two reviewers from approving the same request.
  const verified = await Credential.findOneAndUpdate(
    {
      _id: credential._id,
      institution: institution._id,
      source: "Citizen",
      status: "Active",
      verificationStatus: "Pending"
    },
    {
      $set: {
        verificationStatus: "Verified",
        verifiedByInstitutionUserId: currentUser._id,
        verifiedAt: new Date()
      }
    },
    { new: true, runValidators: true }
  ).select("-document.publicId");

  if (!verified) throw new AppError("Credential has already been reviewed or is no longer active", 409);
  return verified;
};


export const rejectCredential = async (credentialId, rejectionReason, user) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-[0-9]{8}$/.test(credentialId.trim())) throw new AppError("Invalid credential ID", 400);
  if (typeof rejectionReason !== "string" || !rejectionReason.trim() || rejectionReason.trim().length > 1000) throw new AppError("A rejection reason of up to 1000 characters is required", 400);
  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError("User not found", 404);
  if (currentUser.accountStatus !== "Active") throw new AppError("User account is not active", 403);
  if (currentUser.role !== "Institution") throw new AppError("Institution access required", 403);
  if (currentUser.membershipStatus !== "Active") throw new AppError("Institution membership is not active", 403);
  const institution = await Institution.findOne({ institutionId: currentUser.institutionId });
  if (!institution || institution.status !== "Active") throw new AppError("Institution is not active", 403);
  const credential = await Credential.findOne({ credentialId: credentialId.trim() }).select("institution source verificationStatus status");
  if (!credential) throw new AppError("Credential not found", 404);
  if (!credential.institution?.equals(institution._id)) throw new AppError("You are not authorized to reject this credential", 403);
  if (credential.source !== "Citizen") throw new AppError("Only Citizen uploads require review", 409);
  if (credential.status !== "Active" || credential.verificationStatus !== "Pending") throw new AppError("Only active pending credentials can be rejected", 409);
  const rejected = await Credential.findOneAndUpdate(
    { _id: credential._id, institution: institution._id, source: "Citizen", status: "Active", verificationStatus: "Pending" },
    { $set: { verificationStatus: "Rejected", rejectionReason: rejectionReason.trim() } },
    { new: true, runValidators: true }
  ).select("-document.publicId");
  if (!rejected) throw new AppError("Credential has already been reviewed or is no longer active", 409);
  return rejected;
};


export const revokeCredential = async (credentialId, reason, user) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-[0-9]{8}$/.test(credentialId.trim())) throw new AppError("Invalid credential ID", 400);
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000) throw new AppError("A revocation reason of up to 1000 characters is required", 400);

  const userId = user?._id ?? user?.userId;
  if (!mongoose.isValidObjectId(userId)) throw new AppError("Authentication required", 401);
  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError("User not found", 404);
  if (currentUser.accountStatus !== "Active") throw new AppError("User account is not active", 403);
  if (currentUser.role !== "Institution") throw new AppError("Institution access required", 403);
  if (currentUser.membershipStatus !== "Active") throw new AppError("Institution membership is not active", 403);

  const institution = await Institution.findOne({ institutionId: currentUser.institutionId });
  if (!institution || institution.status !== "Active") throw new AppError("Institution is not active", 403);

  const credential = await Credential.findOne({ credentialId: credentialId.trim() })
    .select("institution verificationStatus status");
  if (!credential) throw new AppError("Credential not found", 404);
  if (!credential.institution?.equals(institution._id)) throw new AppError("You are not authorized to revoke this credential", 403);
  if (credential.status !== "Active" || credential.verificationStatus !== "Verified") {
    throw new AppError("Only active verified credentials can be revoked", 409);
  }

  const revoked = await Credential.findOneAndUpdate(
    { _id: credential._id, institution: institution._id, status: "Active", verificationStatus: "Verified" },
    { $set: { status: "Revoked", revokedAt: new Date(), revocationReason: reason.trim() } },
    { new: true, runValidators: true }
  ).select("-document.publicId");

  if (!revoked) throw new AppError("Credential is no longer eligible for revocation", 409);
  return revoked;
};
