import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    resetMocks: true,
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/tests/integration/**"],
  },
});
