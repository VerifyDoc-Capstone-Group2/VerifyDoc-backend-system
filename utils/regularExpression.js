import { AppError } from "../errors/AppError.js";

export const phoneNumberValidator = (phoneNumber) => {
  if (
    phoneNumber === undefined ||
    typeof phoneNumber !== 'string' ||
    phoneNumber.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into phone number', 400);
  };

  // Checks the length of phoneNumber, and makes sure it is up to 11
  if (phoneNumber.startsWith('0')) {
    if (phoneNumber.trim().length !== 11) {
      throw new AppError('Invalid number for phone number', 400);
    }
  } else if (phoneNumber.startsWith('+234')) {
    if (phoneNumber.trim().length !== 14) {
      throw new AppError('Invalid number for phone number', 400);
    }
  } else {
    throw new AppError('Invalid data passed into phone number', 400);
  };

  if (!/^0\d+$/.test(phoneNumber) && !/^\+234\d+$/.test(phoneNumber)) {
    throw new AppError('Invalid phone format', 400);
  }
};