import { describe, it, expect, beforeEach, vi } from "vitest";
import { query, extractKeywords } from "../../../services/ragService.js";
import chunksFixture from "../../fixtures/firestore-chunks.json";
import geminiFixture from "../../fixtures/gemini-response.json";

const mockGetChunksForSearch = vi.hoisted(() => vi.fn());
const mockGetResourcesFromFirestore = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/firestore-db.js", () => ({
  getChunksForSearch: (...args: unknown[]) => mockGetChunksForSearch(...args),
  getResourcesFromFirestore: (...args: unknown[]) => mockGetResourcesFromFirestore(...args),
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
      expect(mockGetChunksForSearch).toHaveBeenCalledWith("user-1", ["deadlines"], 5);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("given getChunksForSearch throws, when query is called, then propagates the error", async () => {
      mockGetChunksForSearch.mockRejectedValue(new Error("Firestore unavailable"));

      await expect(query("user-1", { message: "Hello" })).rejects.toThrow("Firestore unavailable");
    });
  });

  describe("extractKeywords", () => {
    it("normalizes tokens: lowercase, strips punctuation at edges, splits on whitespace", () => {
      expect(extractKeywords("What are the deadlines?", "en")).toEqual(["deadlines"]);
      expect(extractKeywords("Co jest w projekcie?", "pl")).toEqual(["projekc"]);
    });

    it("filters out stop words (EN when lang is en or default)", () => {
      expect(extractKeywords("What are the deadlines?", "en")).toEqual(["deadlines"]);
      expect(extractKeywords("When is the meeting?", "en")).toEqual(["meeting"]);
    });

    it("filters out stop words (PL when lang is pl)", () => {
      const keywords = extractKeywords("Jakie są terminy w projekcie?", "pl");
      expect(keywords).toContain("termin");
      expect(keywords).toContain("projekc");
      expect(keywords).not.toContain("jakie");
      expect(keywords).not.toContain("są");
      expect(keywords).not.toContain("w");
    });

    it("filters tokens shorter than 3 characters", () => {
      expect(extractKeywords("Co i gdzie?", "pl")).toEqual([]);
    });

    it("deduplicates tokens", () => {
      expect(extractKeywords("deadline deadline deadlines", "en")).toEqual(["deadline", "deadlines"]);
    });

    it("stems Polish tokens when lang is pl (Faza 2a)", () => {
      expect(extractKeywords("projekt projekcie projektu", "pl")).toEqual(["projekt", "projekc"]);
      expect(extractKeywords("termin terminy terminów", "pl")).toEqual(["termin"]);
    });

    it("does not stem when lang is en", () => {
      expect(extractKeywords("project projects", "en")).toEqual(["project", "projects"]);
    });
  });
});
