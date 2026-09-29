import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Organization } from "../models/organizationModel.js";
import { Institution } from "../models/institutionModel.js";
import { User } from "../models/userModel.js";


export const approveOrganization = async (organizationID, adminId) => {
  if (
    organizationID === undefined ||
    organizationID === null ||
    typeof organizationID !== 'string' ||
    organizationID.trim().length === 0
  ) {
    throw new AppError('Invalid organization ID', 400);
  };

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const existingOrganization = await Organization.findOne({
      organizationId: organizationID
    });

    if (!existingOrganization) {
      throw new AppError('Organization not found', 404);
    };

    if (existingOrganization.status !== 'Pending Approval') {
      throw new AppError(`Organization cannot be approved because its status is ${existingOrganization.status}`, 400);
    }

    existingOrganization.status = 'Active';
    existingOrganization.approvedByAdminId = adminId;
    existingOrganization.approvedAt = new Date();


    await existingOrganization.save();

    dbSession.commitTransaction();

    return existingOrganization;
  } catch (error) {
    dbSession.abortTransaction();
    throw error;
  } finally {
    dbSession.endSession();
  }
};