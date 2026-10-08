import { createHmac, timingSafeEqual } from "node:crypto";
import { Credential } from "../models/credentialModel.js";
import { AppError } from "../errors/AppError.js";

const requireSecret = () => {
  const secret = process.env.QR_VERIFICATION_SECRET;
  if (!secret || secret.length < 32) throw new AppError("QR verification is not configured", 503);
  return secret;
};

export const createVerificationToken = (credentialId) =>
  createHmac("sha256", requireSecret()).update(credentialId).digest("hex");

export const getCredentialVerification = async (credentialId, token) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-[0-9]{8}$/.test(credentialId)) {
    throw new AppError("Invalid credential ID", 400);
  }
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError("Invalid verification token", 403);
  }
  const expected = createVerificationToken(credentialId);
  if (!timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"))) {
    throw new AppError("Invalid verification token", 403);
  }

  const credential = await Credential.findOne({ credentialId })
    .select("credentialId issuerName credentialType title issueDate graduationYear source verificationStatus status revokedAt");
  if (!credential) throw new AppError("Credential not found", 404);

  const isValid = credential.status === "Active" && credential.verificationStatus === "Verified";
  return {
    credentialId: credential.credentialId,
    issuerName: credential.issuerName,
    credentialType: credential.credentialType,
    title: credential.title,
    issueDate: credential.issueDate,
    graduationYear: credential.graduationYear,
    source: credential.source,
    verificationStatus: credential.verificationStatus,
    status: credential.status,
    isValid,
    revokedAt: credential.status === "Revoked" ? credential.revokedAt : undefined
  };
};
