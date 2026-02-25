import { describe, it, expect } from "vitest";
import { query } from "../../../services/ragService.js";

const runIntegration = !!process.env.RUN_INTEGRATION_TESTS;

describe("ragService (integration)", () => {
  it.skipIf(!runIntegration)(
    "when Firestore and Gemini are available, query returns object with text and sources",
    async () => {
      const result = await query("test-user", { message: "Hello", lang: "en" });
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("sources");
      expect(typeof result.text).toBe("string");
      expect(Array.isArray(result.sources)).toBe(true);
    }
  );
});
