import { describe, it, expect, beforeEach, vi } from "vitest";
import { ask } from "../../../services/planService.js";

const mockGetCalendarEvents = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockCreateCalendarEvent = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/firestore-db.js", () => ({
  getCalendarEvents: (...args: unknown[]) => mockGetCalendarEvents(...args),
  createCalendarEvent: (...args: unknown[]) => mockCreateCalendarEvent(...args),
}));
vi.mock("../../../lib/gemini.js", () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

describe("planService", () => {
  describe("ask", () => {
    beforeEach(() => {
      mockGetCalendarEvents.mockReset();
      mockGenerateContent.mockReset();
      mockCreateCalendarEvent.mockReset();
    });

    it("given events and Gemini returns plain text, when ask is called, then returns text (happy path)", async () => {
      mockGetCalendarEvents.mockResolvedValue([
        {
          id: "e1",
          date: "2025-02-20",
          start_minutes: 540,
          duration_minutes: 60,
          title: "Meeting",
          tags: ["work"],
          color: "#3B82F6",
        },
      ]);
      mockGenerateContent.mockResolvedValue("You spent 1 hour on work this week.");

      const result = await ask("user-1", { message: "How much time on work?" });

      expect(result).toEqual({ text: "You spent 1 hour on work this week." });
      expect(mockGetCalendarEvents).toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("given getCalendarEvents throws, when ask is called, then propagates the error", async () => {
      mockGetCalendarEvents.mockRejectedValue(new Error("Firestore error"));

      await expect(ask("user-1", { message: "Hello" })).rejects.toThrow("Firestore error");
    });
  });
});
