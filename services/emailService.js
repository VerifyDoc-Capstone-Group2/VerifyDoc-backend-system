import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});


export const sendPasswordResetOTP = async ({
  email,
  firstName,
  otp
}) => {
  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: 'VerifyDoc',
        email: process.env.BREVO_SENDER_EMAIL
      },

      to: [
        {
          email,
          name: firstName
        }
      ],

      subject: 'Reset your VerifyDoc password',

      htmlContent: `
        <h2>Password Reset</h2>

        <p>Hello ${firstName},</p>

        <p>Your VerifyDoc password reset code is:</p>

        <h1 style="font-size: 24px; font-weight: bold;">${otp}</h1>

        <p>This code expires in 10 minutes.</p>

        <p>If you didn't request a password reset, you can ignore this email.</p>
      `
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);

    throw new AppError('Failed to send password reset email', 500);
  };
};