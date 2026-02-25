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

    it("given Gemini returns add_events JSON, when ask is called, then creates events and returns created count (en)", async () => {
      mockGetCalendarEvents.mockResolvedValue([]);
      const addEventsJson =
        '{"action":"add_events","events":[{"title":"Auth tests","tags":["testy"],"dates":["2025-03-01"],"duration_minutes":60,"start_minutes":540}]}';
      mockGenerateContent.mockResolvedValue(addEventsJson);
      mockCreateCalendarEvent.mockResolvedValue({} as never);

      const result = await ask("user-1", { message: "I have to do auth tests this week" });

      expect(result).toEqual({ text: "Added 1 event(s) to calendar.", created: 1 });
      expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith("user-1", {
        date: "2025-03-01",
        start_minutes: 540,
        duration_minutes: 60,
        title: "Auth tests",
        tags: ["testy"],
        color: "#3B82F6",
      });
    });

    it("given Gemini returns add_events JSON and lang is pl, when ask is called, then returns Polish reply text", async () => {
      mockGetCalendarEvents.mockResolvedValue([]);
      const addEventsJson =
        '{"action":"add_events","events":[{"title":"Testy","tags":["tag1"],"dates":["2025-03-02"],"duration_minutes":60,"start_minutes":540}]}';
      mockGenerateContent.mockResolvedValue(addEventsJson);
      mockCreateCalendarEvent.mockResolvedValue({} as never);

      const result = await ask("user-1", { message: "mam do zrobienia testy", lang: "pl" });

      expect(result).toEqual({ text: "Dodano 1 wpis(ów) do kalendarza.", created: 1 });
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith("user-1", {
        date: "2025-03-02",
        start_minutes: 540,
        duration_minutes: 60,
        title: "Testy",
        tags: ["tag1"],
        color: "#3B82F6",
      });
    });
  });
});
