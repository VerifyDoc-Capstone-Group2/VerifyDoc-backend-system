import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';
import { User } from "../models/userModel.js";
import { AppError } from "../errors/AppError.js";


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
    throw new AppError('Invalid data passed into email', 400)
  }

  if (
    password.trim().length < 8
  ) {
    throw new AppError('Password must be greater than 8 or equals to 8 characters', 400);
  }

  // 1. Check if the user exists in the database by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email or password", 400);
  }

  // 3. Compare they typed password wit the hashed password in the database
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 400);
  }

  // 2. Check if the account status allows login (matching our business rules!)
  if (user.accountStatus !== "Active") {
    throw new AppError(`Your account is currently ${user.accountStatus}. Please contact support.`, 403);
  }

  // 4. Generate a secure JWT token containing the user's ID and role
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" } // Token expires in 1 day
  );

  // Return the token and user info (excluding the password)
  return {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    }
  };
};