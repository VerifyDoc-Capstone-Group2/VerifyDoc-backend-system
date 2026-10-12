import { asyncHandler } from "../utils/asyncHandler.js";
import {
  requestFreshConfirmation, listOrganizationConfirmations,
  listInstitutionConfirmations, respondToFreshConfirmation
} from "../services/freshConfirmationService.js";

export const requestFreshConfirmationController = asyncHandler(async (req, res) => {
  const data = await requestFreshConfirmation(req.params.shareId, req.body?.reason, req.user);
  res.status(201).json({ message: "Fresh confirmation requested", data });
});

export const listOrganizationConfirmationsController = asyncHandler(async (req, res) => {
  const data = await listOrganizationConfirmations(req.user, req.query);
  res.status(200).json({ message: "Organization confirmation requests retrieved", data });
});

export const listInstitutionConfirmationsController = asyncHandler(async (req, res) => {
  const data = await listInstitutionConfirmations(req.user, req.query);
  res.status(200).json({ message: "Institution confirmation requests retrieved", data });
});

export const respondToFreshConfirmationController = asyncHandler(async (req, res) => {
  const data = await respondToFreshConfirmation(req.params.requestId, req.body, req.user);
  res.status(200).json({ message: "Confirmation response recorded", data });
});
