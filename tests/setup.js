import dns from 'dns';
import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

dns.setServers(['8.8.8.8', '8.8.4.4']);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  if (mongoose.connection.name !== 'VerifyDoc_test') {
    await mongoose.connection.close();

    throw new Error(
      `TEST ABORTED: Connected to "${mongoose.connection.name}" instead of "VerifyDoc_test"`
    );
  }

  console.log(
    `Test database connected: ${mongoose.connection.name}`
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});