import { describe, it, expect, beforeEach, vi } from "vitest";
import { query } from "../../../services/ragService.js";
import chunksFixture from "../../fixtures/firestore-chunks.json";
import geminiFixture from "../../fixtures/gemini-response.json";

const mockGetChunksForSearch = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/firestore-db.js", () => ({
  getChunksForSearch: (...args: unknown[]) => mockGetChunksForSearch(...args),
}));
vi.mock("../../../lib/gemini.js", () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

const chunks = chunksFixture as { content: string; source_name?: string; note_title?: string }[];
const geminiText =
  typeof geminiFixture === "object" && geminiFixture !== null && "text" in geminiFixture
    ? (geminiFixture as { text: string }).text
    : String(geminiFixture);

describe("ragService", () => {
  describe("query", () => {
    beforeEach(() => {
      mockGetChunksForSearch.mockReset();
      mockGenerateContent.mockReset();
    });

    it("given chunks and Gemini response, when query is called, then returns text and sources (happy path)", async () => {
      mockGetChunksForSearch.mockResolvedValue(chunks);
      mockGenerateContent.mockResolvedValue(geminiText);

      const result = await query("user-1", { message: "What are the deadlines?" });

      expect(result).toEqual({
        text: geminiText,
        sources: ["Project Plan", "Meeting Notes"],
      });
      expect(mockGetChunksForSearch).toHaveBeenCalledWith("user-1", ["What", "deadlines?"], 5);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("given getChunksForSearch throws, when query is called, then propagates the error", async () => {
      mockGetChunksForSearch.mockRejectedValue(new Error("Firestore unavailable"));

      await expect(query("user-1", { message: "Hello" })).rejects.toThrow("Firestore unavailable");
    });
  });
});
