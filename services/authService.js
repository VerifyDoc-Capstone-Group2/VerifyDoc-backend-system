import { user } from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";

export const loginUser = async (email, password) => {
    // 1. Check if the user exists in the database by email
    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    // 2. Check if the account status allows login (matching our business rules!)
    if (user.accountStatus !== "Active") {
        throw new AppError(`Your account is currently ${user.accountStatus}. Please contact support.`, 403);
    }

    // 3. Compare they typed password wit the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 401);
    }

    // 4. Generate a secure JWT token containing the user's ID and role
    const token = jwt.sign(
        { userId: user._id, role: user.role },
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