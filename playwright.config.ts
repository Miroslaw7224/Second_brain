import path from "path";
import { defineConfig, devices } from "@playwright/test";

const authFile = path.join(process.cwd(), "playwright", ".auth", "user.json");

/** Run setup + dashboard E2E when not CI, or when CI provides explicit credentials. */
const authE2E = Boolean(process.env.E2E_LOGIN_EMAIL) || !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    ...(authE2E
      ? [
          { name: "setup", testMatch: /auth\.setup\.ts$/ },
          {
            name: "chromium-authenticated",
            use: {
              ...devices["Desktop Chrome"],
              storageState: authFile,
            },
            dependencies: ["setup"],
            testMatch: /\.authenticated\.spec\.ts$/,
          },
        ]
      : []),
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/auth\.setup\.ts$/, /\.authenticated\.spec\.ts$/],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
