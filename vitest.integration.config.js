import { defineConfig } from "vitest/config";

// Integration tests manage their own disposable MongoDB connection and cleanup.
// Do not load tests/setup.js, which expects the legacy MONGODB_URI variable.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.js"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
