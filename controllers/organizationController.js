import { asyncHandler } from '../utils/asyncHandler.js';
import { createOrganization, registerOrganization } from '../services/organizationService.js';


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
    const registeredOrganization = await registerOrganization(req.body);

    res.status(201).json({
      message: 'Organization and user created successfully',
      data: registeredOrganization
    });
  }
);