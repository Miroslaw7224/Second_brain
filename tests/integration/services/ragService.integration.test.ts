import { describe, it, expect } from "vitest";
import { query } from "../../../services/ragService.js";

const runIntegration = !!process.env.RUN_INTEGRATION_TESTS;

function withTimeout<T>(promise: Promise<T>, ms: number, hint: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Integration test timed out after ${ms}ms. ${hint}`
            )
          ),
        ms
      )
    ),
  ]);
}

describe("ragService (integration)", () => {
  it.skipIf(!runIntegration)(
    "when Firestore and Gemini are available, query returns object with text and sources",
    async () => {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          "GEMINI_API_KEY is not set. Add it to .env (loaded in tests/integration/setup.ts)."
        );
      }
      const hint =
        "Ensure: 1) Firestore emulator is running (e.g. npm run emulator:docker or docker compose -f docker-compose-test.yml up -d). 2) Gemini API is reachable.";
      const result = await withTimeout(
        query("test-user", { message: "Hello", lang: "en" }),
        18_000,
        hint
      );
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("sources");
      expect(typeof result.text).toBe("string");
      expect(Array.isArray(result.sources)).toBe(true);
    }
  );
});
