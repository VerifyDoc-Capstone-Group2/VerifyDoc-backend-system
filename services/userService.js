import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';
import { User } from "../models/userModel.js";
import { AppError } from "../errors/AppError.js";
import { generateOTP } from '../utils/randomNumberGenerator.js';
import { passwordResetOTP } from '../models/OTPModel.js';
import { EmailVerificationOTP } from '../models/emailOTPModel.js';
import { sendPasswordResetOTP, sendEmailVerificationOTP } from './emailService.js';


export const createUser = async (userData, dbSession) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    role,
    organizationId,
    institutionId,
  } = userData;

  // Checks the type of data that is passed into field

  // For firstName
  if (
    firstName === undefined ||
    typeof firstName !== 'string' ||
    firstName.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into first name', 400);
  };

  
  // For lastName
  if (
    lastName === undefined ||
    typeof lastName !== 'string' ||
    lastName.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into last name', 400);
  };

  // For email
  if (
    email === undefined ||
    typeof email !== 'string' ||
    email.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into email', 400);
  };

  // For phoneNumber
  if (phoneNumber !== undefined) {
    if (
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
    };
  }

  if (
    password === undefined ||
    typeof password !== 'string' ||
    password.trim().length === 0
  ) {
    throw new AppError('Password is required', 400);
  };

  // To make sure password is greater than 8 character
  if (
    password.trim().length < 8
  ) {
    throw new AppError('Password must be 8 or more than 8 character', 400);
  };

  // To hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // To check whether the role inputed is valid
  const validRoles = ['Citizen', 'Organization', 'Institution'];

  if (
    !validRoles.includes(role)
  ) {
    throw new AppError('Invalid role', 400);
  }

  // If role is a Citizen, automatically set the account status to Active
  let accountStatus;

  if (role === 'Citizen') {
    accountStatus = 'Active'

    if (organizationId !== undefined || institutionId !== undefined) {
      throw new AppError('Citizen cannot have an organization or employer ID', 400);
    };
    
  } else{
    accountStatus = 'Pending Approval'
  };

  // If user role is an organization
  if (role === 'Organization') {
    if (institutionId !== undefined) {
      throw new AppError('Organization cannot have an institution ID', 400);
    };

    if (
      organizationId === undefined ||
      organizationId === null ||
      typeof organizationId !== 'string' ||
      organizationId.trim().length === 0
    ) {
      throw new AppError('Invalid organization ID', 400)
    }
  }

  // If user role is an institution
  if (role === 'Institution') {
    if (organizationId !== undefined) {
      throw new AppError('Institution cannot have an organization ID', 400);
    };

    if (
      institutionId === undefined ||
      institutionId === null ||
      typeof institutionId !== 'string' ||
      institutionId.trim().length === 0
    ) {
      throw new AppError('Invalid institution ID', 400);
    };
  };

  const newUser = await User.create([{
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phoneNumber,
    role,
    organizationId,
    institutionId,
    accountStatus
  }],
  { session: dbSession }
);

  return {
    _id: newUser[0]._id,
    firstName,
    lastName,
    email,
    phoneNumber,
    role,
    organizationId,
    institutionId,
    membershipStatus: newUser[0].membershipStatus
  }

};


export const loginUser = async (loginData) => {
  const {
    email,
    password
  } = loginData;

  // Validate the data
  if (
    email === undefined ||
    typeof email !== 'string' ||
    email.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into email', 400)
  }

  if (
    password === undefined ||
    typeof password !== 'string' ||
    password.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into password', 400)
  }

  // 1. Check if the user exists in the database by email
  const user = await User.findOne({ 
    email: email.trim().toLowerCase()
  });
  if (!user) {
    throw new AppError("Invalid email or password", 400);
  }

  // 3. Compare they typed password wit the hashed password in the database
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 400);
  }

  // 4. Generate a secure JWT token containing the user's ID and role
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Token expires in 1 day
  );

  // Return the token and user info (excluding the password)
  return {
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      role: user.role,
      accountStatus: user.accountStatus,
      membershipStatus: user.membershipStatus,
      organizationId: user.organizationId,
      institutionId: user.institutionId,
      isEmailVerified: user.isEmailVerified
    }
  };
};


export const updateUser = async (userId, data) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    profilePicture
  } = data;

  const updateData = {};

  if (firstName !== undefined) {
    if (typeof firstName !== 'string' || !firstName.trim()) {
      throw new AppError('Invalid first name', 400);
    }

    updateData.firstName = firstName.trim();
  }

  if (lastName !== undefined) {
    if (typeof lastName !== 'string' || !lastName.trim()) {
      throw new AppError('Invalid last name', 400);
    }

    updateData.lastName = lastName.trim();
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      throw new AppError('Invalid email', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId }
    });

    if (emailExists) {
      throw new AppError('Email is already in use', 409);
    }

    updateData.email = normalizedEmail;
    updateData.isEmailVerified = false;
  }

  if (phoneNumber !== undefined) {
    if (
      typeof phoneNumber !== 'string' ||
      !phoneNumberValidator(phoneNumber)
    ) {
      throw new AppError('Invalid phone number', 400);
    }

    updateData.phoneNumber = phoneNumber.trim();
  }

  if (profilePicture !== undefined) {
    if (
      !profilePicture.url ||
      !profilePicture.publicId
    ) {
      throw new AppError('Invalid profile picture', 400);
    }

    updateData.profilePicture = profilePicture;
  };

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    {
      returnDocument: true,
      runValidators: true
    }
  ).select('-password');

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  return updatedUser;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

export const getCurrentUser = async (userId) => {
  if (
    userId === undefined ||
    typeof userId !== 'string' ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new AppError('Invalid user ID', 400);
  };

  const existingUser = await User.findById(userId).select('-password');

  if (!existingUser) {
  throw new AppError('User not found', 404);
  };

  return existingUser;
};


export const forgotPassword = async (data) => {
  const {
    email
  } = data;

  if (
    email === undefined ||
    typeof email !== 'string' ||
    email.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into email', 400);
  };

  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

  if (!existingUser) {
    return;
  };

  await passwordResetOTP.deleteMany({ userId: existingUser._id });

  const OTPNumber = generateOTP().toString();

  const hashedOTPNumber = await bcrypt.hash(OTPNumber, 12);

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  const otpRecord = await passwordResetOTP.create({
    userId: existingUser._id,
    otpHash: hashedOTPNumber,
    expiresAt
  });

  try {

    await sendPasswordResetOTP({
      email: existingUser.email,
      firstName: existingUser.firstName,
      otp: OTPNumber
    });

  } catch (error) {
    await passwordResetOTP.findByIdAndDelete(otpRecord._id);

    throw error;
  }
};


export const verifyPasswordResetOTP = async (data) => {
  const {
    email,
    otp
  } = data;

  if (
    email === undefined ||
    typeof email !== 'string' ||
    email.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into email', 400);
  }

  if (
    otp === undefined ||
    typeof otp !== 'string' ||
    otp.trim().length === 0
  ) {
    throw new AppError('Invalid data passed into OTP', 400);
  }

  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const otpRecord = await passwordResetOTP.findOne({
    userId: existingUser._id
  });

  if (!otpRecord) {
    throw new AppError('User OTP record not found', 404);
  };

  if (otpRecord.expiresAt < new Date()) {
    await passwordResetOTP.findByIdAndDelete(otpRecord._id);

    throw new AppError('OTP has expired. Please request a new one', 400);
  };

  const isOTPValid = await bcrypt.compare(
    otp.trim(),
    otpRecord.otpHash
  );

  if (!isOTPValid) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= 5) {
      await passwordResetOTP.findByIdAndDelete(otpRecord._id);
      throw new AppError('Too many failed attempts. Please request a new OTP', 429);
    };

    await otpRecord.save();

    throw new AppError('Invalid OTP', 400);
  };

  const resetToken = jwt.sign(
    {
      userId: existingUser._id,
      purpose: 'password-reset'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '10m'
    }
  );

  await passwordResetOTP.findByIdAndDelete(
    otpRecord._id
  );

  return {
    resetToken
  };
};


export const resetPassword = async (data) => {
  const {
    resetToken,
    newPassword
  } = data;

  if (
    resetToken === undefined ||
    typeof resetToken !== 'string' ||
    resetToken.trim().length === 0
  ) {
    throw new AppError('Reset token is required', 400);
  }

  if (
    newPassword === undefined ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8
  ) {
    throw new AppError(
      'Password must be at least 8 characters',
      400
    );
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      resetToken,
      process.env.JWT_SECRET
    );
  } catch (error) {
    throw new AppError(
      'Reset token is invalid or has expired',
      401
    );
  }

  if (decodedToken.purpose !== 'password-reset') {
    throw new AppError(
      'Invalid password reset token',
      401
    );
  }

  const existingUser = await User.findById(
    decodedToken.userId
  );

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    12
  );

  existingUser.password = hashedPassword;

  await existingUser.save();

  return {
    message: 'Password reset successfully'
  };
};

export const sendVerificationOTP = async (userId) => {
  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (existingUser.isEmailVerified) {
    throw new AppError(
      'Email is already verified',
      400
    );
  }

  // Remove any previous verification OTP
  await EmailVerificationOTP.deleteMany({
    userId: existingUser._id
  });

  const OTPNumber = generateOTP().toString();

  const hashedOTPNumber = await bcrypt.hash(
    OTPNumber,
    12
  );

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  const otpRecord = await EmailVerificationOTP.create({
    userId: existingUser._id,
    otpHash: hashedOTPNumber,
    expiresAt
  });

  try {
    await sendEmailVerificationOTP({
      email: existingUser.email,
      firstName: existingUser.firstName,
      otp: OTPNumber
    });

  } catch (error) {
    await EmailVerificationOTP.findByIdAndDelete(
      otpRecord._id
    );

    throw error;
  }
};

export const verifyEmailOTP = async (
  userId,
  data
) => {
  const { otp } = data;

  if (
    otp === undefined ||
    typeof otp !== 'string' ||
    otp.trim().length === 0
  ) {
    throw new AppError(
      'Verification code is required',
      400
    );
  }

  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (existingUser.isEmailVerified) {
    throw new AppError(
      'Email is already verified',
      400
    );
  }

  const otpRecord = await EmailVerificationOTP.findOne({
    userId: existingUser._id
  });

  if (!otpRecord) {
    throw new AppError(
      'Verification code not found. Please request a new one',
      404
    );
  }

  // Check expiration
  if (otpRecord.expiresAt < new Date()) {
    await EmailVerificationOTP.findByIdAndDelete(
      otpRecord._id
    );

    throw new AppError(
      'Verification code has expired. Please request a new one',
      400
    );
  }

  const isOTPValid = await bcrypt.compare(
    otp.trim(),
    otpRecord.otpHash
  );

  if (!isOTPValid) {
    otpRecord.attempts += 1;

    if (otpRecord.attempts >= 5) {
      await EmailVerificationOTP.findByIdAndDelete(
        otpRecord._id
      );

      throw new AppError(
        'Too many failed attempts. Please request a new verification code',
        429
      );
    }

    await otpRecord.save();

    throw new AppError(
      'Invalid verification code',
      400
    );
  }

  existingUser.isEmailVerified = true;

  await existingUser.save();

  await EmailVerificationOTP.findByIdAndDelete(
    otpRecord._id
  );

  return {
    isEmailVerified: existingUser.isEmailVerified
  };
};