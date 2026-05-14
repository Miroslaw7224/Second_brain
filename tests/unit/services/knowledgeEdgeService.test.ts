import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockFirestoreKnowledge = vi.hoisted(() => ({
  createKnowledgeEdge: vi.fn(),
  getEdgesForNode: vi.fn(),
  deleteKnowledgeEdge: vi.fn(),
}));

vi.mock("@/lib/firestore-knowledge", () => mockFirestoreKnowledge);

const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

const fakeEdge = {
  id: "edge-1",
  fromNodeId: "node-1",
  toNodeId: "node-2",
  relation: "related" as const,
  strength: 0.85,
  createdAt: fakeTimestamp,
};

describe("knowledgeEdgeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEdge", () => {
    it("tworzy krawędź w Firestore", async () => {
      mockFirestoreKnowledge.createKnowledgeEdge.mockResolvedValue(fakeEdge);
      const { createEdge } = await import("@/services/knowledgeEdgeService");

      const result = await createEdge("user-1", {
        fromNodeId: "node-1",
        toNodeId: "node-2",
        relation: "related",
        strength: 0.85,
      });

      expect(mockFirestoreKnowledge.createKnowledgeEdge).toHaveBeenCalledWith("user-1", {
        fromNodeId: "node-1",
        toNodeId: "node-2",
        relation: "related",
        strength: 0.85,
      });
      expect(result).toEqual(fakeEdge);
    });
  });

  describe("getEdgesForNode", () => {
    it("zwraca krawędzie dla węzła", async () => {
      mockFirestoreKnowledge.getEdgesForNode.mockResolvedValue([fakeEdge]);
      const { getEdgesForNode } = await import("@/services/knowledgeEdgeService");

      const result = await getEdgesForNode("user-1", "node-1");

      expect(mockFirestoreKnowledge.getEdgesForNode).toHaveBeenCalledWith("user-1", "node-1");
      expect(result).toEqual([fakeEdge]);
    });
  });

  describe("deleteEdge", () => {
    it("usuwa krawędź z Firestore", async () => {
      mockFirestoreKnowledge.deleteKnowledgeEdge.mockResolvedValue(undefined);
      const { deleteEdge } = await import("@/services/knowledgeEdgeService");

      await deleteEdge("user-1", "edge-1");

      expect(mockFirestoreKnowledge.deleteKnowledgeEdge).toHaveBeenCalledWith("user-1", "edge-1");
    });
  });
});
