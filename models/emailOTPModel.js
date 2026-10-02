import mongoose from 'mongoose';

const emailVerificationOTPSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  otpHash: {
    type: String,
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  },

  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const EmailVerificationOTP = mongoose.model(
  'EmailVerificationOTP',
  emailVerificationOTPSchema
);