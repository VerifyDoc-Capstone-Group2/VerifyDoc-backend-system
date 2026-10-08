import { defineConfig } from "vitest/config";

// Isolated service tests use mocked models and do not connect to MongoDB.
export default defineConfig({
  test: {
    include: ["tests/credentials/**/*.unit.test.js"],
    environment: "node"
  }
});
