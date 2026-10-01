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


export const rejectOrganization = async (organizationID, adminId, rejectionData) => {
  if (
    organizationID === undefined ||
    organizationID === null ||
    typeof organizationID !== 'string' ||
    organizationID.trim().length === 0
  ) {
    throw new AppError('Invalid organization ID', 400);
  };

  const { 
    rejectionReason
  } = rejectionData

  if (
    rejectionReason === undefined ||
    typeof rejectionReason !== 'string' ||
    rejectionReason.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into rejection reason', 400);
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
      throw new AppError(`Organization cannot be rejected because its status is ${existingOrganization.status}`, 400);
    }

    const organizationOwner = await User.findOneAndUpdate(
      {
        _id: existingOrganization.ownerUserId
      },
      {
        accountStatus: 'Rejected',
        membershipStatus: 'Rejected'
      },
      { returnDocument: 'after' }
    ).session(dbSession);

    if (!organizationOwner) {
      throw new AppError('Organization owner not found', 404);
    }

    existingOrganization.status = 'Rejected';
    existingOrganization.rejectedByAdminId = adminId;
    existingOrganization.rejectedAt = new Date();

    existingOrganization.rejectionReason = rejectionReason.trim();


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


export const rejectInstitution = async (institutionID, adminId, rejectionData) => {
  if (
    institutionID === undefined ||
    institutionID === null ||
    typeof institutionID !== 'string' ||
    institutionID.trim().length === 0
  ) {
    throw new AppError('Invalid institution ID', 400);
  };

  const { 
    rejectionReason
  } = rejectionData

  if (
    rejectionReason === undefined ||
    typeof rejectionReason !== 'string' ||
    rejectionReason.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into rejection reason', 400);
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
      throw new AppError(`Institution cannot be rejected because its status is ${existingInstitution.status}`, 400);
    }

    const institutionOwner = await User.findOneAndUpdate(
      {
        _id: existingInstitution.ownerUserId
      },
      {
        accountStatus: 'Rejected',
        membershipStatus: 'Rejected'
      },
      { returnDocument: 'after' }
    ).session(dbSession);

    if (!institutionOwner) {
      throw new AppError('Institution owner not found', 404);
    }

    existingInstitution.status = 'Rejected';
    existingInstitution.rejectedByAdminId = adminId;
    existingInstitution.rejectedAt = new Date();

    existingInstitution.rejectionReason = rejectionReason.trim();


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


export const getPendingOrganizations = async () => {
  
  const pendingOrganizations = await Organization.find({
    status: 'Pending Approval'
  }).sort({ createdAt: 1 });

  return pendingOrganizations;
  
};


export const getPendingInstitutions = async () => {
  
  const pendingInstitutions = await Institution.find({
    status: 'Pending Approval'
  }).sort({ createdAt: 1 });

  return pendingInstitutions;

};

export const getApprovalQueue = async () => {
  const [organizations, institutions] = await Promise.all([
    getPendingOrganizations(),
    getPendingInstitutions()
  ]);

  return {
    organizations,
    institutions
  };
};

export const getUsers = async (queryData) => {
  const {
    page = 1,
    limit = 20,
    role,
    accountStatus,
    sort = 'newest'
  } = queryData;

  // Convert query strings to numbers
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  // Validate pagination
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1
  ) {
    throw new AppError('Invalid page number', 400);
  }

  if (
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    throw new AppError('Invalid limit', 400);
  }

  // Build filter dynamically
  const filter = {};

  if (role) {
    const validRoles = [
      'Citizen',
      'Organization',
      'Institution',
      'Admin'
    ];

    if (!validRoles.includes(role)) {
      throw new AppError('Invalid user role', 400);
    }

    filter.role = role;
  }

  if (accountStatus) {
    const validStatuses = [
      'Active',
      'Pending Approval',
      'Rejected'
    ];

    if (!validStatuses.includes(accountStatus)) {
      throw new AppError('Invalid account status', 400);
    }

    filter.accountStatus = accountStatus;
  }

  // Sorting
  let sortOption;

  if (sort === 'newest') {
    sortOption = { createdAt: -1 };
  } else if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  } else {
    throw new AppError('Invalid sort option', 400);
  }

  // Pagination
  const skip = (pageNumber - 1) * limitNumber;

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber),

    User.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalUsers / limitNumber);

  return {
    users,
    pagination: {
      currentPage: pageNumber,
      limit: limitNumber,
      totalUsers,
      totalPages
    }
  };
};


export const getAdminDashboard = async () => {
  const [
    totalUsers,
    citizens,
    organizationUsers,
    institutionUsers,
    admins
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'Citizen' }),
    User.countDocuments({ role: 'Organization' }),
    User.countDocuments({ role: 'Institution' }),
    User.countDocuments({ role: 'Admin' })
  ]);

  const [
    totalOrganizations,
    activeOrganizations,
    pendingOrganizations,
    rejectedOrganizations,
    suspendedOrganizations,
  ] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ status: 'Active' }),
    Organization.countDocuments({ status: 'Pending Approval' }),
    Organization.countDocuments({ status: 'Rejected' }),
    Organization.countDocuments({ status: 'Suspended' })
  ]);


  const [
    totalInstitutions,
    activeInstitutions,
    pendingInstitutions,
    rejectedInstitutions,
    suspendedInstitutions,
  ] = await Promise.all([
    Institution.countDocuments(),
    Institution.countDocuments({ status: 'Active' }),
    Institution.countDocuments({ status: 'Pending Approval' }),
    Institution.countDocuments({ status: 'Rejected' }),
    Institution.countDocuments({ status: 'Suspended' })
  ]);

  const activeEntities = activeInstitutions + activeOrganizations;
  const pendingApprovals = pendingInstitutions + pendingOrganizations;

  return  {
    users: {
      total: totalUsers,
      citizens,
      organizations: organizationUsers,
      institutions: institutionUsers,
      admins
    },

    organizations: {
      total: totalOrganizations,
      active: activeOrganizations,
      pending: pendingOrganizations,
      rejected: rejectedOrganizations,
      suspended: suspendedOrganizations
    },

    institutions: {
      total: totalInstitutions,
      active: activeInstitutions,
      pending: pendingInstitutions,
      rejected: rejectedInstitutions,
      suspended: suspendedInstitutions
    },

    activeEntities,
    pendingApprovals
  };
};