import request from 'supertest';
import bcrypt from 'bcrypt';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi
} from 'vitest';

import app from '../../app.js';
import { User } from '../../models/userModel.js';
import { EmailVerificationOTP } from '../../models/emailOTPModel.js';


// Mock the email service
vi.mock('../../services/emailService.js', () => ({
  sendEmailVerificationOTP: vi.fn(),
  sendPasswordResetOTP: vi.fn()
}));

import {
  sendEmailVerificationOTP
} from '../../services/emailService.js';


describe('Email Verification', () => {

  const testEmail = 'emailverification@verifydoc.test';
  const testPassword = 'Password123';

  let testUser;
  let token;


  beforeEach(async () => {
    // Clean up in case a previous test failed
    await User.deleteMany({
      email: testEmail
    });

    // Create password hash because we're inserting
    // directly into MongoDB
    const hashedPassword = await bcrypt.hash(
      testPassword,
      12
    );

    testUser = await User.create({
      firstName: 'Email',
      lastName: 'Verification',
      email: testEmail,
      password: hashedPassword,
      role: 'Citizen'
    });

    // Login normally so we get a real JWT
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(loginResponse.status).toBe(200);

    // CHANGE THIS if your login response stores
    // the token somewhere else.
    token = loginResponse.body.data.token;
  });


  afterEach(async () => {
    if (testUser) {
      await EmailVerificationOTP.deleteMany({
        userId: testUser._id
      });
    }

    await User.deleteMany({
      email: testEmail
    });

    vi.clearAllMocks();
  });


  it('should send an email verification OTP', async () => {
    const response = await request(app)
      .post('/auth/email/send-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'Verification code sent successfully'
    );

    // An OTP record should now exist
    const otpRecord = await EmailVerificationOTP.findOne({
      userId: testUser._id
    });

    expect(otpRecord).not.toBeNull();

    expect(otpRecord.otpHash).toBeDefined();

    expect(otpRecord.attempts).toBe(0);

    // We mocked Brevo, but the application should
    // still have attempted to send the email.
    expect(
      sendEmailVerificationOTP
    ).toHaveBeenCalledTimes(1);
  });


  it('should verify the email with the correct OTP', async () => {
    // Request OTP
    const sendResponse = await request(app)
      .post('/auth/email/send-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(sendResponse.status).toBe(200);

    /*
      Our mocked email function received:

      {
        email,
        firstName,
        otp
      }

      So we can grab the REAL generated OTP without
      actually sending an email.
    */

    const emailArguments =
      sendEmailVerificationOTP.mock.calls[0][0];

    const generatedOTP = emailArguments.otp;

    expect(generatedOTP).toBeDefined();


    // Send that OTP back to VerifyDoc
    const verifyResponse = await request(app)
      .post('/auth/email/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        otp: generatedOTP
      });


    expect(verifyResponse.status).toBe(200);

    expect(verifyResponse.body.message).toBe(
      'Email verified successfully'
    );

    expect(
      verifyResponse.body.data.isEmailVerified
    ).toBe(true);


    // Check the actual User document
    const updatedUser = await User.findById(
      testUser._id
    );

    expect(updatedUser.isEmailVerified).toBe(true);


    // OTP should be destroyed after successful verification
    const otpRecord = await EmailVerificationOTP.findOne({
      userId: testUser._id
    });

    expect(otpRecord).toBeNull();
  });

    it('should reject an incorrect verification OTP', async () => {
      // Request a real verification OTP first
      const sendResponse = await request(app)
        .post('/auth/email/send-verification')
        .set('Authorization', `Bearer ${token}`);

      expect(sendResponse.status).toBe(200);

      // Submit an intentionally wrong OTP
      const verifyResponse = await request(app)
        .post('/auth/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          otp: '000000'
        });

      expect(verifyResponse.status).toBe(400);

      // User should still be unverified
      const updatedUser = await User.findById(
        testUser._id
      );

      expect(updatedUser.isEmailVerified).toBe(false);

      // OTP should still exist because this was
      // only the first failed attempt
      const otpRecord = await EmailVerificationOTP.findOne({
        userId: testUser._id
      });

      expect(otpRecord).not.toBeNull();

      // Failed-attempt counter should increase
      expect(otpRecord.attempts).toBe(1);
    });

    it('should delete the OTP after 5 failed verification attempts', async () => {
    // Generate an OTP first
    const sendResponse = await request(app)
      .post('/auth/email/send-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(sendResponse.status).toBe(200);

    // First 4 incorrect attempts
    for (let attempt = 1; attempt <= 4; attempt++) {
      const response = await request(app)
        .post('/auth/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          otp: '000000'
        });

      expect(response.status).toBe(400);
    }

    // 5th incorrect attempt should trigger the limit
    const fifthAttempt = await request(app)
      .post('/auth/email/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        otp: '000000'
      });

    expect(fifthAttempt.status).toBe(429);

    // The OTP should have been destroyed
    const otpRecord = await EmailVerificationOTP.findOne({
      userId: testUser._id
    });

    expect(otpRecord).toBeNull();

    // The email must still be unverified
    const updatedUser = await User.findById(
      testUser._id
    );

    expect(updatedUser.isEmailVerified).toBe(false);
  });

    it('should reject an expired verification OTP', async () => {
    const sendResponse = await request(app)
      .post('/auth/email/send-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(sendResponse.status).toBe(200);

    // Get the OTP that would have been emailed
    const generatedOTP =
      sendEmailVerificationOTP.mock.calls[0][0].otp;

    // Manually expire the OTP in our test database
    await EmailVerificationOTP.findOneAndUpdate(
      {
        userId: testUser._id
      },
      {
        expiresAt: new Date(Date.now() - 1000)
      }
    );

    const response = await request(app)
      .post('/auth/email/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        otp: generatedOTP
      });

    expect(response.status).toBe(400);

    // Expired OTP should be removed
    const otpRecord = await EmailVerificationOTP.findOne({
      userId: testUser._id
    });

    expect(otpRecord).toBeNull();

    // User must remain unverified
    const updatedUser = await User.findById(
      testUser._id
    );

    expect(updatedUser.isEmailVerified).toBe(false);
  });

    it('should reject verification OTP requests without authentication', async () => {
    const response = await request(app)
      .post('/auth/email/send-verification');

    expect(response.status).toBe(401);

    expect(
      sendEmailVerificationOTP
    ).not.toHaveBeenCalled();
  });

});