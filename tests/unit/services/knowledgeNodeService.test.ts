import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockFirestoreKnowledge = vi.hoisted(() => ({
  createKnowledgeNode: vi.fn(),
  getKnowledgeNode: vi.fn(),
  updateKnowledgeNode: vi.fn(),
  deleteKnowledgeNode: vi.fn(),
  deleteEdgesForNode: vi.fn(),
  listKnowledgeNodes: vi.fn(),
}));

const mockOpenai = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/firestore-knowledge", () => mockFirestoreKnowledge);
vi.mock("@/lib/openai", () => mockOpenai);

const fakeEmbedding = Array.from({ length: 1536 }, () => 0.1);
const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

const fakeNode = {
  id: "node-1",
  type: "note" as const,
  title: "Test",
  content: "Content",
  tags: [],
  sources: [],
  embedding: fakeEmbedding,
  createdAt: fakeTimestamp,
  updatedAt: fakeTimestamp,
  createdBy: "user" as const,
};

describe("knowledgeNodeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenai.generateEmbedding.mockResolvedValue(fakeEmbedding);
  });

  describe("createNode", () => {
    it("generuje embedding i tworzy węzeł w Firestore", async () => {
      mockFirestoreKnowledge.createKnowledgeNode.mockResolvedValue(fakeNode);
      const { createNode } = await import("@/services/knowledgeNodeService");

      const result = await createNode("user-1", {
        type: "note",
        title: "Test",
        content: "Content",
        createdBy: "user",
      });

      expect(mockOpenai.generateEmbedding).toHaveBeenCalledWith("Test\nContent");
      expect(mockFirestoreKnowledge.createKnowledgeNode).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ title: "Test", content: "Content", embedding: fakeEmbedding })
      );
      expect(result).toEqual(fakeNode);
    });
  });

  describe("getNode", () => {
    it("zwraca węzeł z Firestore", async () => {
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(fakeNode);
      const { getNode } = await import("@/services/knowledgeNodeService");

      const result = await getNode("user-1", "node-1");

      expect(mockFirestoreKnowledge.getKnowledgeNode).toHaveBeenCalledWith("user-1", "node-1");
      expect(result).toEqual(fakeNode);
    });
  });

  describe("deleteNode", () => {
    it("usuwa węzeł i jego krawędzie", async () => {
      mockFirestoreKnowledge.deleteKnowledgeNode.mockResolvedValue(undefined);
      mockFirestoreKnowledge.deleteEdgesForNode.mockResolvedValue(undefined);
      const { deleteNode } = await import("@/services/knowledgeNodeService");

      await deleteNode("user-1", "node-1");

      expect(mockFirestoreKnowledge.deleteKnowledgeNode).toHaveBeenCalledWith("user-1", "node-1");
      expect(mockFirestoreKnowledge.deleteEdgesForNode).toHaveBeenCalledWith("user-1", "node-1");
    });
  });

  describe("listNodes", () => {
    it("zwraca listę węzłów z opcjonalnym filtrem po typie", async () => {
      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([fakeNode]);
      const { listNodes } = await import("@/services/knowledgeNodeService");

      const result = await listNodes("user-1", "note");

      expect(mockFirestoreKnowledge.listKnowledgeNodes).toHaveBeenCalledWith("user-1", "note");
      expect(result).toEqual([fakeNode]);
    });
  });
});
