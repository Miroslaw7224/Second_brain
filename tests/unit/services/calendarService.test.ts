import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../../../services/calendarService.js";

const mockGetCalendarEvents = vi.hoisted(() => vi.fn());
const mockCreateCalendarEvent = vi.hoisted(() => vi.fn());
const mockUpdateCalendarEvent = vi.hoisted(() => vi.fn());
const mockDeleteCalendarEvent = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/firestore-db.js", () => ({
  getCalendarEvents: (...args: unknown[]) => mockGetCalendarEvents(...args),
  createCalendarEvent: (...args: unknown[]) => mockCreateCalendarEvent(...args),
  updateCalendarEvent: (...args: unknown[]) => mockUpdateCalendarEvent(...args),
  deleteCalendarEvent: (...args: unknown[]) => mockDeleteCalendarEvent(...args),
}));

describe("calendarService", () => {
  beforeEach(() => {
    mockGetCalendarEvents.mockReset();
    mockCreateCalendarEvent.mockReset();
    mockUpdateCalendarEvent.mockReset();
    mockDeleteCalendarEvent.mockReset();
  });

  describe("getCalendarEvents", () => {
    it("given Firestore returns events, when getCalendarEvents is called, then returns the list (happy path)", async () => {
      const events = [
        {
          id: "e1",
          date: "2025-02-20",
          start_minutes: 540,
          duration_minutes: 60,
          title: "Meeting",
          tags: [],
          color: "#3B82F6",
        },
      ];
      mockGetCalendarEvents.mockResolvedValue(events);

      const result = await getCalendarEvents("user-1");

      expect(result).toEqual(events);
    });

    it("given getCalendarEvents throws, when getCalendarEvents is called, then propagates the error", async () => {
      mockGetCalendarEvents.mockRejectedValue(new Error("DB error"));

      await expect(getCalendarEvents("user-1")).rejects.toThrow("DB error");
    });
  });

  describe("createCalendarEvent", () => {
    it("given valid data, when createCalendarEvent is called, then returns created event (happy path)", async () => {
      const event = {
        id: "e1",
        date: "2025-02-20",
        start_minutes: 540,
        duration_minutes: 60,
        title: "Meeting",
        tags: [],
        color: "#3B82F6",
      };
      mockCreateCalendarEvent.mockResolvedValue(event);

      const result = await createCalendarEvent("user-1", {
        date: "2025-02-20",
        start_minutes: 540,
        duration_minutes: 60,
        title: "Meeting",
        tags: [],
        color: "#3B82F6",
      });

      expect(result).toEqual(event);
    });

    it("given firestore createCalendarEvent throws (e.g. duration not multiple of 15), when createCalendarEvent is called, then propagates the error", async () => {
      mockCreateCalendarEvent.mockRejectedValue(
        new Error("duration_minutes must be a multiple of 15")
      );

      await expect(
        createCalendarEvent("user-1", {
          date: "2025-02-20",
          start_minutes: 540,
          duration_minutes: 30,
          title: "X",
          tags: [],
          color: "#3B82F6",
        })
      ).rejects.toThrow("duration_minutes must be a multiple of 15");
    });
  });

  describe("updateCalendarEvent", () => {
    it("given valid id and data, when updateCalendarEvent is called, then delegates to firestore (happy path)", async () => {
      mockUpdateCalendarEvent.mockResolvedValue(undefined);

      await updateCalendarEvent("user-1", "e1", { title: "Updated" });

      expect(mockUpdateCalendarEvent).toHaveBeenCalledWith("user-1", "e1", { title: "Updated" });
    });

    it("given updateCalendarEvent throws, when updateCalendarEvent is called, then propagates the error", async () => {
      mockUpdateCalendarEvent.mockRejectedValue(new Error("Update failed"));

      await expect(
        updateCalendarEvent("user-1", "e1", { title: "X" })
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deleteCalendarEvent", () => {
    it("given valid id, when deleteCalendarEvent is called, then delegates to firestore (happy path)", async () => {
      mockDeleteCalendarEvent.mockResolvedValue(undefined);

      await deleteCalendarEvent("user-1", "e1");

      expect(mockDeleteCalendarEvent).toHaveBeenCalledWith("user-1", "e1");
    });

    it("given deleteCalendarEvent throws, when deleteCalendarEvent is called, then propagates the error", async () => {
      mockDeleteCalendarEvent.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteCalendarEvent("user-1", "e1")).rejects.toThrow("Delete failed");
    });
  });
});
