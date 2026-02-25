import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    passWithNoTests: true,
    testTimeout: 20_000,
    setupFiles: ["./tests/integration/setup.ts"],
  },
});
