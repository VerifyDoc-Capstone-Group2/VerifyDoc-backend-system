import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Organization } from "../models/organizationModel.js";
import { User } from "../models/userModel.js";
import { Institution } from "../models/institutionModel.js";


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
      organizationId: organizationID.trim()
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


export const approveInstitution = async (institutionID, adminId) => {
  if (
    institutionID === undefined ||
    institutionID === null ||
    typeof institutionID !== 'string' ||
    institutionID.trim().length === 0
  ) {
    throw new AppError('Invalid institution ID', 400);
  };

  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    const existingInstitution = await Institution.findOne({
      institutionId: institutionID.trim()
    }).session(dbSession);

    if (!existingInstitution) {
      throw new AppError('Institution not found', 404);
    };

    if (existingInstitution.status !== 'Pending Approval') {
      throw new AppError(`Institution cannot be approved because its status is ${existingInstitution.status}`, 400);
    }

    const institutionOwner = await User.findOneAndUpdate(
      {
        _id: existingInstitution.ownerUserId
      },
      {
        accountStatus: 'Active',
        membershipStatus: 'Active'
      },
      { returnDocument: 'after' }
    ).session(dbSession);

    if (!institutionOwner) {
      throw new AppError('Institution owner not found', 404);
    }

    existingInstitution.status = 'Active';
    existingInstitution.approvedByAdminId = adminId;
    existingInstitution.approvedAt = new Date();


    await existingInstitution.save({ session: dbSession });

    await dbSession.commitTransaction();

    return existingInstitution;
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    await dbSession.endSession();
  }
};