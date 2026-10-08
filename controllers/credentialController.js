import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../errors/AppError.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../services/cloudinaryService.js";
import {
  createCredential, getCredentialById, getCitizenCredentials,
  getInstitutionCredentials, verifyCredential, rejectCredential, revokeCredential
} from "../services/credentialService.js";

export const createCredentialController = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("A PDF document is required", 400);
  let uploaded;
  try {
    uploaded = await uploadToCloudinary(req.file.buffer, {
      folder: "verifydoc/credentials",
      resource_type: "raw"
    });
    const credential = await createCredential({ ...req.body, document: uploaded }, req.user);
    res.status(201).json({ message: "Credential created successfully", data: credential });
  } catch (error) {
    if (uploaded?.publicId) {
      try {
        await deleteFromCloudinary(uploaded.publicId, { resource_type: "raw" });
      } catch (cleanupError) {
        console.error("Failed to clean up credential upload:", cleanupError.message);
      }
    }
    throw error;
  }
});

export const getCredentialByIdController = asyncHandler(async (req, res) => {
  const data = await getCredentialById(req.params.credentialId, req.user);
  res.status(200).json({ message: "Credential retrieved successfully", data });
});

export const getCitizenCredentialsController = asyncHandler(async (req, res) => {
  const data = await getCitizenCredentials(req.user, req.query);
  res.status(200).json({ message: "Citizen credentials retrieved successfully", data });
});

export const getInstitutionCredentialsController = asyncHandler(async (req, res) => {
  const data = await getInstitutionCredentials(req.user, req.query);
  res.status(200).json({ message: "Institution credentials retrieved successfully", data });
});

export const verifyCredentialController = asyncHandler(async (req, res) => {
  const data = await verifyCredential(req.params.credentialId, req.user);
  res.status(200).json({ message: "Credential verified successfully", data });
});

export const rejectCredentialController = asyncHandler(async (req, res) => {
  const data = await rejectCredential(req.params.credentialId, req.body?.rejectionReason, req.user);
  res.status(200).json({ message: "Credential rejected successfully", data });
});

export const revokeCredentialController = asyncHandler(async (req, res) => {
  const data = await revokeCredential(req.params.credentialId, req.body?.revocationReason, req.user);
  res.status(200).json({ message: "Credential revoked successfully", data });
});
