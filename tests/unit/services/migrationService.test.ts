import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockNodeService = vi.hoisted(() => ({
  createNode: vi.fn(),
}));

const mockGetFirestore = vi.hoisted(() => vi.fn());

vi.mock("@/services/knowledgeNodeService", () => mockNodeService);
vi.mock("firebase-admin/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase-admin/firestore")>();
  return { ...actual, getFirestore: mockGetFirestore };
});

const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

function makeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
}

function makeFirestore(snap: ReturnType<typeof makeSnap>) {
  return {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          get: () => Promise.resolve(snap),
        }),
      }),
    }),
  };
}

describe("migrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodeService.createNode.mockResolvedValue({ id: "new-node" });
  });

  describe("migrateNotes", () => {
    it("tworzy węzeł dla każdej notatki", async () => {
      const snap = makeSnap([
        {
          id: "note-1",
          data: { title: "Notatka 1", content: "Treść notatki", createdAt: fakeTimestamp },
        },
        {
          id: "note-2",
          data: { title: "Notatka 2", content: "Druga treść", createdAt: fakeTimestamp },
        },
      ]);
      mockGetFirestore.mockReturnValue(makeFirestore(snap));

      const { migrateNotes } = await import("@/services/migrationService");
      const count = await migrateNotes("user-1");

      expect(count).toBe(2);
      expect(mockNodeService.createNode).toHaveBeenCalledTimes(2);
      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          type: "note",
          title: "Notatka 1",
          content: "Treść notatki",
          createdBy: "user",
        })
      );
    });
  });

  describe("migrateTasks", () => {
    it("mapuje due_date na dueDate", async () => {
      const snap = makeSnap([
        {
          id: "task-1",
          data: {
            title: "Zadanie",
            description: "Opis",
            due_date: "2026-06-01",
            status: "todo",
            createdAt: fakeTimestamp,
          },
        },
      ]);
      mockGetFirestore.mockReturnValue(makeFirestore(snap));

      const { migrateTasks } = await import("@/services/migrationService");
      await migrateTasks("user-1");

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          type: "task",
          title: "Zadanie",
          content: "Opis",
          dueDate: "2026-06-01",
        })
      );
    });
  });

  describe("migrateResources", () => {
    it("mapuje url na sources", async () => {
      const snap = makeSnap([
        {
          id: "res-1",
          data: {
            title: "Zasób",
            description: "Opis zasobu",
            url: "https://example.com",
            tags: ["tech"],
            createdAt: fakeTimestamp,
            updatedAt: fakeTimestamp,
          },
        },
      ]);
      mockGetFirestore.mockReturnValue(makeFirestore(snap));

      const { migrateResources } = await import("@/services/migrationService");
      await migrateResources("user-1");

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          type: "resource",
          title: "Zasób",
          tags: ["tech"],
          sources: [{ title: "Zasób", url: "https://example.com" }],
        })
      );
    });
  });

  describe("migrateCalendarEvents", () => {
    it("mapuje date na dueDate w węźle event", async () => {
      const snap = makeSnap([
        {
          id: "event-1",
          data: {
            title: "Spotkanie",
            date: "2026-06-15",
            start_minutes: 540,
            duration_minutes: 60,
            tags: ["praca"],
            createdAt: fakeTimestamp,
          },
        },
      ]);
      mockGetFirestore.mockReturnValue(makeFirestore(snap));

      const { migrateCalendarEvents } = await import("@/services/migrationService");
      await migrateCalendarEvents("user-1");

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          type: "event",
          title: "Spotkanie",
          dueDate: "2026-06-15",
          tags: ["praca"],
        })
      );
    });
  });

  describe("migrateAll", () => {
    it("zwraca wynik z licznikami per kolekcja", async () => {
      const snap1 = makeSnap([
        { id: "n1", data: { title: "A", content: "B", createdAt: fakeTimestamp } },
      ]);
      mockGetFirestore.mockReturnValue(makeFirestore(snap1));

      const { migrateAll } = await import("@/services/migrationService");
      const result = await migrateAll("user-1");

      expect(typeof result.notes).toBe("number");
      expect(typeof result.resources).toBe("number");
      expect(typeof result.documents).toBe("number");
      expect(typeof result.tasks).toBe("number");
      expect(typeof result.events).toBe("number");
      expect(result.total).toBe(
        result.notes + result.resources + result.documents + result.tasks + result.events
      );
    });
  });
});
