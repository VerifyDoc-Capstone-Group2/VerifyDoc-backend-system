import { asyncHandler } from "../utils/asyncHandler.js";
import { createInstitution, registerInstitution } from "../services/institutionService.js";
import { AppError } from "../errors/AppError.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";
import { sendVerificationOTP } from "../services/userService.js";


export const createInstitutionController = asyncHandler(
  async (req, res) => {
    const newInstitution = await createInstitution(req.body);

    res.status(201).json({
      message: 'Institution was created successfully',
      data: newInstitution
    });
  }
);


export const registerInstitutionController = asyncHandler(
  async (req, res) => {
    const accreditationDocument = req.files?.accreditationDocument?.[0];

    const profilePicture = req.files?.profilePicture?.[0];

    if (!accreditationDocument) {
      throw new AppError('Accreditation document is required', 400);
    }

    const uploadedDocument = await uploadToCloudinary(
      accreditationDocument.buffer,
      {
        folder: 'verifydoc/accreditation-documents',
        resource_type: 'raw'
      }
    );

    let uploadedProfilePicture;

    if (profilePicture) {
      uploadedProfilePicture = await uploadToCloudinary(profilePicture.buffer, {
        folder: 'verifydoc/profile-pictures',
        resource_type: 'image'
      })
    }

    const data = {
      ...req.body,
      institution: {
        ...req.body.institution,
        accreditationDocument: uploadedDocument
      },
      user: {
        ...req.body.user,
        ...(uploadedProfilePicture && {
          profilePicture: uploadedProfilePicture
        })
      }
    };

    const registeredInstitution = await registerInstitution(data);

    try {
      await sendVerificationOTP({
        email: registeredInstitution.user.email
      });
    } catch (error) {
      console.error(
        'Failed to send verification OTP:',
        error.message
      );
    }

    res.status(201).json({
      message: 'Institution was registered successfully',
      data: registeredInstitution
    });
  }
);