import request from 'supertest';
import { describe, it, expect, afterEach } from 'vitest';
import app from '../../app.js';
import { User } from '../../models/userModel.js';

describe('POST /auth/register', () => {

  afterEach(async () => {
    await User.deleteMany({
      email: 'testuser@verifydoc.test'
    });
  });

  it('should register a new Citizen successfully', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@verifydoc.test',
        password: 'Password123',
        role: 'Citizen'
      });

    // Check HTTP response
    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty(
      'message',
      'User created successfully'
    );

    expect(response.body.data).toBeDefined();

    expect(response.body.data.email).toBe(
      'testuser@verifydoc.test'
    );

    expect(response.body.data.role).toBe('Citizen');

    // Check what was actually stored
    const createdUser = await User.findOne({
      email: 'testuser@verifydoc.test'
    });

    expect(createdUser).not.toBeNull();

    expect(createdUser.firstName).toBe('Test');
    expect(createdUser.lastName).toBe('User');
    expect(createdUser.role).toBe('Citizen');
    expect(createdUser.accountStatus).toBe('Active');

    // Plaintext password must never be stored
    expect(createdUser.password).not.toBe('Password123');
  });

  it('should reject registration when email is missing', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        password: 'Password123',
        role: 'Citizen'
      });

    expect(response.status).toBe(400);

    const createdUser = await User.findOne({
      firstName: 'Test',
      lastName: 'User'
    });

    expect(createdUser).toBeNull();
  });

});