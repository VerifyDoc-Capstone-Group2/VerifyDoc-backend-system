import { Credential } from "../models/credentialModel.js";
import { AppError } from "../errors/AppError.js";
import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { Institution } from "../models/institutionModel.js";
import { generateEightDigitNumber } from "../utils/randomNumberGenerator.js";


export const createCredential = async (credentialData, user) => {
  const {
    citizenId,
    institution,
    issuerName,
    credentialType,
    title,
    fieldOfStudy,
    issueDate,
    graduationYear,
    document
  } = credentialData;

  // Validate required fields
  if (
    credentialType === undefined ||
    title === undefined ||
    issueDate === undefined ||
    document === undefined
  ) {
    throw new AppError('Missing required fields for credential creation', 400);
  };


  if (typeof credentialType !== 'string' ||
    credentialType.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into credentialType', 400);
  };

  if (typeof title !== 'string' ||
    title.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into title', 400);
  };

  if (fieldOfStudy !== undefined) {
    if (typeof fieldOfStudy !== 'string' ||
      fieldOfStudy.trim().length === 0
    ) {
      throw new AppError('Invalid data passed into fieldOfStudy', 400);
    }
  }


  if (isNaN(Date.parse(issueDate))) {
    throw new AppError('Invalid data passed into issueDate', 400);
  };

  if (graduationYear !== undefined) {
    if (typeof graduationYear !== 'number' || graduationYear < 1900 || graduationYear > new Date().getFullYear()) {
      throw new AppError('Invalid data passed into graduationYear', 400);
    }
  };

  // To automatically generate credential ID
  let credentialId;
  
  credentialId = `VDOC-CRED-${generateEightDigitNumber()}`;

  // Check if the credential ID that was generated exists
  let existingCredentialId = await Credential.findOne({credentialId });

  // If there is an credential with that same ID, generate a new one
  while (existingCredentialId) {
    credentialId = `VDOC-CRED-${generateEightDigitNumber
      ()}`;

    existingCredentialId = await Credential.findOne({credentialId});
  };

  // Check if the institution user is associated with an institution
  if (user.role === 'Institution') {

    const existingInstitution = await Institution.findOne({
      institutionId: user.institutionId
    });

    if (!existingInstitution) {
      throw new AppError('Institution associated with this user was not found', 404);
    };

    if (existingInstitution.status !== 'Active') {
      throw new AppError(
        'Institution is not active',
        403
      );
    };

    if (issuerName !== undefined) {
      throw new AppError(
        'Issuer name cannot be provided by an institution user',
        400
      );
    };

    if (citizenId === undefined) {
      throw new AppError('Citizen ID is required for credential creation', 400);
    };

    if (!mongoose.isValidObjectId(citizenId)) {
      throw new AppError('Invalid citizen ID', 400);
    };

    const existingCitizen = await User.findById(citizenId);

    if (!existingCitizen) {
      throw new AppError('Citizen not found', 404);
    };

    if (existingCitizen.role !== 'Citizen') {
      throw new AppError('The provided user is not a citizen', 400);
    };

    const newCredential = await Credential.create({
      credentialId,

      institution: existingInstitution._id,

      issuerName: existingInstitution.institutionName,

      citizenId: existingCitizen._id,

      credentialType,
      title,
      fieldOfStudy,
      issueDate,
      graduationYear,
      document,

      source: 'Institution',

      createdByUserId: user._id,

      verifiedByInstitutionUserId: user._id,
      verifiedAt: new Date()
    });

    return newCredential;
  };


  // If the user is a citizen, they can create their own credentials
  if (user.role === 'Citizen') {

    let existingInstitution;
    let finalIssuerName;

    if (institution === undefined) {
      if (
        issuerName === undefined ||
        typeof issuerName !== 'string' ||
        issuerName.trim().length === 0
      ) {
        throw new AppError('Invalid issuer name', 400);
      }

      finalIssuerName = issuerName.trim();
    }

    if (institution !== undefined) {
      if (issuerName !== undefined) {
        throw new AppError(
          'Issuer name should not be provided when an institution is selected',
          400
        );
      }

      if (!mongoose.isValidObjectId(institution)) {
        throw new AppError(
          'Invalid institution ID',
          400
        );
      }

      existingInstitution =
        await Institution.findById(institution);

      if (!existingInstitution) {
        throw new AppError(
          'Institution not found',
          404
        );
      }

      if (existingInstitution.status !== 'Active') {
        throw new AppError(
          'Institution is not active',
          403
        );
      }

      finalIssuerName =
        existingInstitution.institutionName;
    };

    const newCredential = await Credential.create({
      credentialId,
      citizenId: user._id,
      institution: existingInstitution?._id,
      issuerName: finalIssuerName,
      credentialType,
      title,
      fieldOfStudy,
      issueDate,
      graduationYear,
      document,
      source: 'Citizen',
      createdByUserId: user._id
    });

    return newCredential;

  }

  throw new AppError('You are not authorized to create credentials', 403);

};