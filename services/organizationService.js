import { AppError } from '../errors/AppError.js';
import { Organization } from '../models/organizationModel.js';
import { phoneNumberValidator } from '../utils/regularExpression.js';



// For creating an organization
export const createOrganization = async (organizationData) => {
  const {
    organizationName,
    organizationType,
    cacNumber,
    cacCertificate,
    officialEmail,
    phoneNumber,
    address,
    website
  } = organizationData;

  // Validates the sort of data passed into every variable
  if (
    organizationName === undefined ||
    typeof organizationName !== 'string' ||
    organizationName.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into organization name', 400);
  }

  // For organization type
  const validOrganizationType = ['Employer', 'Recruitment Agency', 'HR Firm', 'Other'];

  if (
    organizationType === undefined ||
    typeof organizationType !== 'string' ||
    organizationType.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into organization type', 400);
  }

  // Checks if the value passed into organization type is valid
  if (
    !validOrganizationType.includes(organizationType)
  ) {
    throw new AppError('Invalid organization type', 400);
  };

  // For CAC Number
  if (
    cacNumber === undefined ||
    typeof cacNumber !== 'string' ||
    cacNumber.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into CAC Number', 400);
  }

  // For RC CAC Number
  if (
    cacNumber.startsWith('RC ')
  ) {
    if (
      cacNumber.trim().length < 9 ||
      cacNumber.trim().length > 10
    ) {
      throw new AppError('Invalid CAC RC Number', 400);
    }
  } else if (
    cacNumber.startsWith('BN ')
  ) {
    if (
      cacNumber.trim().length !== 9
    ) {
      throw new AppError('Invalid CAC BN Number', 400)
    }
  } else if (
    cacNumber.startsWith('IT ')
  ) {
    if (
      cacNumber.trim().length < 8 ||
      cacNumber.trim().length > 9
    ) {
      throw new AppError('Invalid CAC IT Number', 400)
    }
  } else {
    throw new AppError('Invalid CAC Number', 400);
  }

  // For Email
  if (
    officialEmail === undefined ||
    typeof officialEmail !== 'string' ||
    officialEmail.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into official email', 400);
  };

  phoneNumberValidator(phoneNumber);

  // For address
  if (
    address === undefined ||
    typeof address !== 'string' ||
    address.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into address', 400);
  };

  // For website
  if (website !== undefined) {
    if (
      typeof website !== 'string' ||
      website.trim().length === 0
    ) {
      throw new AppError('Invalid data passed into website', 400);
    };
  }


  const newOrganization = await Organization.create({
    organizationName,
    organizationType,
    cacNumber,
    cacCertificate,
    officialEmail,
    phoneNumber,
    address,
    website
  });

  return newOrganization;
};