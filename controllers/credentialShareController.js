import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listEligibleOrganizations, createCredentialShare, getCitizenShares,
  revokeCredentialShare, getOrganizationShares, getOrganizationSharedCredential
} from "../services/credentialShareService.js";

export const listEligibleOrganizationsController = asyncHandler(async (req, res) => {
  const data = await listEligibleOrganizations(req.user, req.query);
  res.status(200).json({ message: "Eligible organizations retrieved successfully", data });
});
export const createCredentialShareController = asyncHandler(async (req, res) => {
  const data = await createCredentialShare(req.body, req.user);
  res.status(201).json({ message: "Credential shared successfully", data });
});
export const getCitizenSharesController = asyncHandler(async (req, res) => {
  const data = await getCitizenShares(req.user, req.query);
  res.status(200).json({ message: "Credential sharing history retrieved successfully", data });
});
export const revokeCredentialShareController = asyncHandler(async (req, res) => {
  const data = await revokeCredentialShare(req.params.shareId, req.user);
  res.status(200).json({ message: "Credential share revoked successfully", data });
});
export const getOrganizationSharesController = asyncHandler(async (req, res) => {
  const data = await getOrganizationShares(req.user, req.query);
  res.status(200).json({ message: "Shared credentials retrieved successfully", data });
});
export const getOrganizationSharedCredentialController = asyncHandler(async (req, res) => {
  const data = await getOrganizationSharedCredential(req.params.shareId, req.user);
  res.status(200).json({ message: "Shared credential retrieved successfully", data });
});
