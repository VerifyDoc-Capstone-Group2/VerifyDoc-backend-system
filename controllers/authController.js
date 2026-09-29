import { loginUser } from "../services/authService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loginController = asyncHandler(
    async (req, res) => {
        const { email, password } = req.body;

        // Call the service to do the heavy lifting
        const result = await loginUser(email, password);

        // Send back a success response with the token and user details
        res.status(200).json({
            message: "Login successful",
            token: result.token,
            data: result.user
        });
    }
);