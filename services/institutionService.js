import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import { Institution } from "../models/institutionModel.js";
import { phoneNumberValidator } from "../utils/regularExpression.js";
import { generateFourDigitNumber } from "../utils/randomNumberGenerator.js";
import { createUser } from "./userService.js";


export const createInstitution = async (institutionData, dbSession) => {
  const {
    institutionName,
    institutionType,
    officialEmail,
    phoneNumber,
    address,
    website,
    accreditationDocument
  } = institutionData;

  // To validate data that is being passed
  // For institution name
  if (
    institutionName === undefined ||
    typeof institutionName !== 'string' ||
    institutionName.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into institution name', 400);
  };

  // For institution type
  if (
    institutionType === undefined ||
    typeof institutionType !== 'string' ||
    institutionType.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into institution type', 400);
  };

  const validInstitutionType = ['Government Institution', 'University', 'Polytechnic', 'Other'];

  if (
    !validInstitutionType.includes(institutionType)
  ) {
    throw new AppError('Institution type is not valid', 400);
  };

  // For email
  if (
    officialEmail === undefined ||
    typeof officialEmail !== 'string' ||
    officialEmail.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into official email', 400);
  };

  // for phone number
  phoneNumberValidator(phoneNumber);

  // for website
  if (website !== undefined) {
    if (
      typeof website !== 'string' ||
      website.trim().length === 0
    ) {
      throw new AppError('Invalid data passed into website', 400);
    };
  };

  // For address
  if (
    address === undefined ||
    typeof address !== 'string' ||
    address.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into address', 400);
  };

  // For accreditation document
  if (
    accreditationDocument === undefined ||
    accreditationDocument === null ||
    typeof accreditationDocument !== 'object' ||
    accreditationDocument.url === undefined ||
    typeof accreditationDocument.url !== 'string' ||
    accreditationDocument.url.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into accreditation document', 400);
  };

  // To automatically generate institution ID
  let prefix;
  let institutionId;

  const match = institutionName.match(/[a-zA-Z]/g);

  if (match && match.length >= 3) {
    prefix = match.slice(0, 3).join('').toUpperCase();
  } else {
    throw new AppError('Institution name is invalid', 400);
  }

  institutionId = `VDOC-INS-${prefix}-${generateFourDigitNumber()}`;

  // Check if the institution ID that was generated exists
  let existingInstitutionId = await Institution.findOne({institutionId});

  // If there is an institution with that same ID, generate a new one
  while (existingInstitutionId) {
    institutionId = `VDOC-INS-${prefix}-${generateFourDigitNumber()}`;

    existingInstitutionId = await Institution.findOne({institutionId});
  };

  const newInstitution = await Institution.create(
    [{
    institutionName,
    institutionId,
    institutionType,
    officialEmail,
    phoneNumber,
    address,
    website,
    accreditationDocument
    }],
    { session: dbSession }
  );

  return newInstitution[0];
};


// For registering an institution with user
export const registerInstitution = async (data) => {
  // To avoid inconsistency when either one of the two action fail, We need to use MongoDB Transaction
  const dbSession = await mongoose.startSession();

  try {
    dbSession.startTransaction();

    // Sends the institution information to createInstitution()
    const institution = await createInstitution(data.institution, dbSession);

    // Sends the user information to createUser()
    const user = await createUser({
      ...data.user,
      institutionId: institution.institutionId
    }, dbSession);

    institution.ownerUserId = user._id;

    await institution.save({ session: dbSession });

    await dbSession.commitTransaction();

    return {
      institution,
      user
    }
    
  } catch (error) {
    await dbSession.abortTransaction();
    throw error;
  } finally {
    await dbSession.endSession();
  };
};