import { asyncHandler } from '../utils/asyncHandler.js';
import { createOrganization } from '../services/organizationService.js';


export const createOrganizationController = asyncHandler(
  async (req, res) => {
    const newOrganization = await createOrganization(req.body);

    res.status(201).json({
      message: 'Organization created successfully',
      data: newOrganization
    });
  }
);