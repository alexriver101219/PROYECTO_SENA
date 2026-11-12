import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.js"],
    setupFiles: ["./test/setup.js"],
    hookTimeout: 120000,
    testTimeout: 30000,
    maxWorkers: 1,
  },
});
