import { uploadToCloudinary } from "../services/cloudinaryService.js";
import { createUser, forgotPassword, getCurrentUser, getUserById, loginUser, updateUser, verifyPasswordResetOTP, resetPassword, sendVerificationOTP, verifyEmailOTP } from "../services/userService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createUserController = asyncHandler(
  async (req, res) => {
    let profilePicture;

    if (req.file) {
      profilePicture = await uploadToCloudinary(
        req.file.buffer,
        {
          folder: 'verifydoc/profile-pictures',
          resource_type: 'image'
        }
      )
    };

    const data = {
      ...req.body,
      ...(profilePicture && { profilePicture })
    }

    const newUser = await createUser(data);

    res.status(201).json({
      message: 'User created successfully',
      data: newUser
    })
  }
);


export const loginController = asyncHandler(
  async (req, res) => {
    const user = await loginUser(req.body);

    res.status(200).json({
      message: 'User logged in successfully',
      data: user
    });
  }
);


export const updateUserController = asyncHandler(
  async (req, res) => {
    const existingUser = await getUserById(req.user.userId);

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    let uploadedProfilePicture;
    let updatedUser;

    try {
      if (req.file) {
        uploadedProfilePicture = await uploadToCloudinary(
          req.file.buffer,
          {
            folder: 'verifydoc/profile-pictures',
            resource_type: 'image'
          }
        );
      }

      const data = {
        ...req.body,
        ...(uploadedProfilePicture && {
          profilePicture: uploadedProfilePicture
        })
      };

      updatedUser = await updateUser(
        req.user.userId,
        data
      );

    } catch (error) {
      if (uploadedProfilePicture?.publicId) {
        try {
          await deleteFromCloudinary(
            uploadedProfilePicture.publicId,
            {
              resource_type: 'image'
            }
          );
        } catch (cleanupError) {
          console.error(
            'Failed to clean up new profile picture:',
            cleanupError
          );
        }
      }

      throw error;
    }

    
    if (
      uploadedProfilePicture &&
      existingUser.profilePicture?.publicId
    ) {
      try {
        await deleteFromCloudinary(
          existingUser.profilePicture.publicId,
          {
            resource_type: 'image'
          }
        );
      } catch (cleanupError) {
        console.error(
          'Failed to delete old profile picture:',
          cleanupError
        );
      }
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      data: updatedUser
    });
  }
);

export const getCurrentUserController = asyncHandler(
  async (req, res) => {
    const user = await getCurrentUser(req.user.userId);

    res.status(200).json({
      message: 'Current user retrieved successfully',
      data: user
    });
  }
);


export const forgotPasswordController = asyncHandler(
  async (req, res) => {
    await forgotPassword(req.body);

    res.status(200).json({
      message: 'If an account exists with that email, a password reset code has been sent.'
    });
  }
);


export const verifyPasswordResetOTPController = asyncHandler(
  async (req, res) => {
    const result = await verifyPasswordResetOTP(req.body);

    res.status(200).json({
      message: 'OTP verified successfully',
      data: result
    });
  }
);

export const resetPasswordController = asyncHandler(
  async (req, res) => {
    await resetPassword(req.body);

    res.status(200).json({
      message: 'Password reset successfully'
    });
  }
);

export const resendPasswordResetOTPController = asyncHandler(
  async (req, res) => {
    await forgotPassword(req.body);

    res.status(200).json({
      message: 'If an account exists with that email, a new password reset code has been sent.'
    });
  }
);

export const sendVerificationOTPController = asyncHandler(
  async (req, res) => {
    await sendVerificationOTP(req.user.userId);

    res.status(200).json({
      message: 'Verification code sent successfully'
    });
  }
);

export const verifyEmailOTPController = asyncHandler(
  async (req, res) => {
    const result = await verifyEmailOTP(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      message: 'Email verified successfully',
      data: result
    });
  }
);