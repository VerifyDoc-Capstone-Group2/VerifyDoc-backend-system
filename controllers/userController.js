import { createUser, loginUser } from "../services/userService.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const createUserController = asyncHandler(
  async (req, res) => {
    const newUser = await createUser(req.body);

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