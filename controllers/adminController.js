import { approveInstitution, approveOrganization } from "../services/adminService.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const approveOrganizationController = asyncHandler(
  async (req, res) => {
    const approvedOrganization = await approveOrganization(req.params.organizationId, req.user.userId);

    res.status(200).json({
      message: 'Organization was approved successfully',
      data: approvedOrganization
    });
  }
);


export const approveInstitutionController = asyncHandler(
  async (req, res) => {
    const approvedInstitution = await approveInstitution(req.params.institutionId, req.user.userId);

    res.status(200).json({
      message: 'Institution was approved successfully',
      data: approvedInstitution
    });
  }
);