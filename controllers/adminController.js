import { approveInstitution, approveOrganization, getApprovalQueue, getPendingInstitutions, getPendingOrganizations, getUsers, rejectInstitution, rejectOrganization } from "../services/adminService.js";
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


export const rejectOrganizationController = asyncHandler(
  async (req, res) => {
    const rejectedOrganization = await rejectOrganization(req.params.organizationId, req.user.userId, req.body);

    res.status(200).json({
      message: 'Organization was rejected successfully',
      data: rejectedOrganization
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


export const rejectInstitutionController = asyncHandler(
  async (req, res) => {
    const rejectedInstitution = await rejectInstitution(req.params.institutionId, req.user.userId, req.body);

    res.status(200).json({
      message: 'Institution was rejected successfully',
      data: rejectedInstitution
    });
  }
);


export const pendingOrganizationsController = asyncHandler(
  async (req, res) => {
    const pendingOrganizations = await getPendingOrganizations();

    res.status(200).json({
      message: "Pending organizations retrieved successfully",
      data: pendingOrganizations
    });
  }
);


export const pendingInstitutionsController = asyncHandler(
  async (req, res) => {
    const pendingInstitutions = await getPendingInstitutions();

    res.status(200).json({
      message: "Pending institutions retrieved successfully",
      data: pendingInstitutions
    });
  }
);

export const approvalQueueController = asyncHandler(
  async (req, res) => {
    const approvalQueue = await getApprovalQueue();

    res.status(200).json({
      message: 'Approval queue retrieved successfully',
      data: approvalQueue
    });
  }
);

export const getUsersController = asyncHandler(
  async(req, res) => {
    const fetchedUsers = await getUsers(req.query);

    res.status(200).json({
      message: 'Users retrieved successfully',
      data: fetchedUsers
    });
  }
);