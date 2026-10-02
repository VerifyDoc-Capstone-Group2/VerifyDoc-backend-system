import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../app.js';

describe('VerifyDoc API', () => {
  it('should return 200 when the server health route is requested', async () => {
    const response = await request(app)
      .get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Server is running');
  });
});