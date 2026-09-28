import { asyncHandler } from "../utils/asyncHandler.js";
import { createInstitution, registerInstitution } from "../services/institutionService.js";


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
    const registeredInstitution = await registerInstitution(req.body);

    res.status(201).json({
      message: 'Institution was registered successfully',
      data: registeredInstitution
    });
  }
);