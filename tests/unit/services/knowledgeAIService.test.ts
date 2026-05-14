import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockSearchService = vi.hoisted(() => ({
  searchNodes: vi.fn(),
}));

const mockNodeService = vi.hoisted(() => ({
  createNode: vi.fn(),
}));

const mockFirestoreKnowledge = vi.hoisted(() => ({
  listKnowledgeNodes: vi.fn(),
  getKnowledgeNode: vi.fn(),
  createKnowledgeEdge: vi.fn(),
}));

const mockOpenai = vi.hoisted(() => ({
  generateChatCompletion: vi.fn(),
}));

vi.mock("@/services/knowledgeSearchService", () => mockSearchService);
vi.mock("@/services/knowledgeNodeService", () => mockNodeService);
vi.mock("@/lib/firestore-knowledge", () => mockFirestoreKnowledge);
vi.mock("@/lib/openai", () => mockOpenai);

const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

const fakeNode = {
  id: "node-1",
  type: "note" as const,
  title: "Projekt X",
  content: "Deadline 20 maja",
  tags: [],
  sources: [],
  embedding: [],
  createdAt: fakeTimestamp,
  updatedAt: fakeTimestamp,
  createdBy: "user" as const,
};

describe("knowledgeAIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("query — tryb wyszukiwania", () => {
    it("zwraca odpowiedź AI z węzłami jako źródłami", async () => {
      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([]);
      mockSearchService.searchNodes.mockResolvedValue([{ node: fakeNode, score: 0.9 }]);
      mockOpenai.generateChatCompletion.mockResolvedValue("Deadline projektu X to 20 maja.");

      const { query } = await import("@/services/knowledgeAIService");
      const result = await query("user-1", { message: "kiedy deadline projektu X?", lang: "pl" });

      expect(mockSearchService.searchNodes).toHaveBeenCalledWith(
        "user-1",
        "kiedy deadline projektu X?"
      );
      expect(mockOpenai.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("Projekt X"),
            }),
          ]),
        })
      );
      expect(result.text).toBe("Deadline projektu X to 20 maja.");
      expect(result.sources).toContain("Projekt X");
    });
  });

  describe("query — tryb zapisu (save command)", () => {
    it("tworzy węzeł gdy wiadomość zawiera 'zapamiętaj'", async () => {
      mockOpenai.generateChatCompletion.mockResolvedValueOnce(
        JSON.stringify({
          type: "note",
          title: "Projekt X deadline",
          content: "Deadline projektu X to 20 maja.",
          tags: ["projekt"],
          dueDate: null,
        })
      );

      mockNodeService.createNode.mockResolvedValue({
        ...fakeNode,
        id: "new-node",
        title: "Projekt X deadline",
      });
      mockSearchService.searchNodes.mockResolvedValue([]);
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(null);

      const { query } = await import("@/services/knowledgeAIService");
      const result = await query("user-1", {
        message: "zapamiętaj że projekt X ma deadline 20 maja",
        lang: "pl",
      });

      expect(mockNodeService.createNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ title: "Projekt X deadline", createdBy: "ai" })
      );
      expect(result.text).toContain("Zapisano");
      expect(result.sources).toContain("Projekt X deadline");
    });
  });

  describe("getUpcomingReminders", () => {
    it("zwraca węzły task/event z dueDate w ciągu 48h", async () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString().split("T")[0];

      const upcoming = { ...fakeNode, type: "task" as const, dueDate: in24h };
      const tooLate = { ...fakeNode, id: "late", type: "task" as const, dueDate: in72h };
      const noDate = { ...fakeNode, id: "nodate", type: "task" as const };

      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([upcoming, tooLate, noDate]);

      const { getUpcomingReminders } = await import("@/services/knowledgeAIService");
      const result = await getUpcomingReminders("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("node-1");
    });

    it("ignoruje węzły typu note/resource", async () => {
      const noteWithDate = {
        ...fakeNode,
        type: "note" as const,
        dueDate: new Date(Date.now() + 60_000).toISOString().split("T")[0],
      };
      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([noteWithDate]);

      const { getUpcomingReminders } = await import("@/services/knowledgeAIService");
      const result = await getUpcomingReminders("user-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("buildConnections", () => {
    it("tworzy krawędzie dla podobnych węzłów", async () => {
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(fakeNode);
      mockSearchService.searchNodes.mockResolvedValue([
        { node: { ...fakeNode, id: "node-2" }, score: 0.82 },
      ]);
      mockFirestoreKnowledge.createKnowledgeEdge.mockResolvedValue({});

      const { buildConnections } = await import("@/services/knowledgeAIService");
      await buildConnections("user-1", "node-1");

      expect(mockFirestoreKnowledge.createKnowledgeEdge).toHaveBeenCalledWith("user-1", {
        fromNodeId: "node-1",
        toNodeId: "node-2",
        relation: "related",
        strength: 0.82,
      });
    });

    it("nie tworzy krawędzi gdy węzeł nie istnieje", async () => {
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(null);

      const { buildConnections } = await import("@/services/knowledgeAIService");
      await buildConnections("user-1", "nonexistent");

      expect(mockFirestoreKnowledge.createKnowledgeEdge).not.toHaveBeenCalled();
    });
  });
});
