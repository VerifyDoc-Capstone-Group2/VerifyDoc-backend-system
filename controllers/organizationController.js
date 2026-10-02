import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { AppError } from '../errors/AppError.js';
import { createOrganization, registerOrganization } from '../services/organizationService.js';
import { sendVerificationOTP } from '../services/userService.js';


export const createOrganizationController = asyncHandler(
  async (req, res) => {
    const newOrganization = await createOrganization(req.body);

    res.status(201).json({
      message: 'Organization created successfully',
      data: newOrganization
    });
  }
);


export const registerOrganizationController = asyncHandler(
  async (req, res) => {
    const cacCertificate = req.files?.cacCertificate?.[0];

    const profilePicture = req.files?.profilePicture?.[0];

    if (!cacCertificate) {
      throw new AppError('CAC certificate is required', 400);
    };

    const uploadedCertificate = await uploadToCloudinary(cacCertificate.buffer, {
      folder: 'verifydoc/cac-documents',
      resource_type: 'raw'
    });

    let uploadedProfilePicture;

    if (profilePicture) {
      uploadedProfilePicture = await uploadToCloudinary(profilePicture.buffer, {
        folder: 'verifydoc/profile-pictures',
        resource_type: 'image'
      })
    };

    const data = {
      ...req.body,
      organization: {
        ...req.body.organization,
        cacCertificate: uploadedCertificate
      },
      user: {
        ...req.body.user,
        ...(uploadedProfilePicture && {
          profilePicture: uploadedProfilePicture
        })
      }
    }

    const registeredOrganization = await registerOrganization(data);

    try {
      await sendVerificationOTP({
        email: result.user.email
      });
    } catch (error) {
      console.error(
        'Failed to send verification OTP:',
        error.message
      );
    }

    res.status(201).json({
      message: 'Organization and user created successfully',
      data: registeredOrganization
    });
  }
);