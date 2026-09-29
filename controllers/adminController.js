import { approveOrganization } from "../services/adminService.js";
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