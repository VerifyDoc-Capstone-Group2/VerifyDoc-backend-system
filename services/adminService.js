import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Organization } from "../models/organizationModel.js";
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
    }).session(dbSession);

    if (!existingOrganization) {
      throw new AppError('Organization not found', 404);
    };

    if (existingOrganization.status !== 'Pending Approval') {
      throw new AppError(`Organization cannot be approved because its status is ${existingOrganization.status}`, 400);
    }

    const organizationOwner = await User.findOneAndUpdate(
      {
        _id: existingOrganization.ownerUserId
      },
      {
        accountStatus: 'Active',
        membershipStatus: 'Active'
      },
      { returnDocument: 'after' }
    ).session(dbSession);

    if (!organizationOwner) {
      throw new AppError('Organization owner not found', 404);
    }

    existingOrganization.status = 'Active';
    existingOrganization.approvedByAdminId = adminId;
    existingOrganization.approvedAt = new Date();


    await existingOrganization.save({ session: dbSession });

    await dbSession.commitTransaction();

    return existingOrganization;
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    await dbSession.endSession();
  }
};