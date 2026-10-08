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
