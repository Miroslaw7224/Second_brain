import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    resetMocks: true,
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/tests/integration/**"],
  },
  coverage: {
    provider: "v8",
    include: ["services/**/*.ts"],
    reportsDirectory: "./coverage",
    thresholds: {
      "services/**/*.ts": {
        statements: 60,
        lines: 60,
        functions: 50,
        branches: 40,
      },
    },
  },
});
