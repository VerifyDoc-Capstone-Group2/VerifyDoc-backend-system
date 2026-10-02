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


export const sendEmailVerificationOTP = async ({
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

      subject: 'Verify your VerifyDoc email',

      htmlContent: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Verify your email</h2>

          <p>Hi ${firstName},</p>

          <p>
            Use the verification code below to verify
            your VerifyDoc email address.
          </p>

          <h1 style="letter-spacing: 6px;">
            ${otp}
          </h1>

          <p>
            This code expires in 10 minutes.
          </p>

          <p>
            If you did not create a VerifyDoc account,
            you can ignore this email.
          </p>
        </div>
      `
    });

  } catch (error) {
    throw new AppError(
      'Failed to send email verification code',
      500
    );
  }
};