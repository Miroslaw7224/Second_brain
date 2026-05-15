import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockFirestoreKnowledge = vi.hoisted(() => ({
  listAllKnowledgeNodesWithEmbeddings: vi.fn(),
}));

const mockOpenai = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
}));

vi.mock("@/lib/firestore-knowledge", () => mockFirestoreKnowledge);
vi.mock("@/lib/openai", () => mockOpenai);

const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

function unitVec(dim: number, axis: number): number[] {
  return Array.from({ length: dim }, (_, i) => (i === axis ? 1 : 0));
}

function makeNode(id: string, embedding: number[]) {
  return {
    id,
    type: "note" as const,
    title: `Node ${id}`,
    content: "Content",
    tags: [],
    sources: [],
    embedding,
    createdAt: fakeTimestamp,
    updatedAt: fakeTimestamp,
    createdBy: "user" as const,
  };
}

describe("knowledgeSearchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchNodes", () => {
    it("zwraca węzły posortowane malejąco po score", async () => {
      const queryEmbedding = unitVec(1536, 0);
      const nodeA = makeNode("a", unitVec(1536, 0)); // identical → score=1.0
      const nodeB = makeNode("b", unitVec(1536, 1)); // orthogonal → score=0, filtered

      mockOpenai.generateEmbedding.mockResolvedValue(queryEmbedding);
      mockFirestoreKnowledge.listAllKnowledgeNodesWithEmbeddings.mockResolvedValue([nodeA, nodeB]);

      const { searchNodes } = await import("@/services/knowledgeSearchService");
      const results = await searchNodes("user-1", "test query");

      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe("a");
      expect(results[0].score).toBeCloseTo(1.0);
    });

    it("filtruje węzły poniżej progu 0.60 gdy istnieją wyniki powyżej progu", async () => {
      const queryEmbedding = unitVec(1536, 0);
      // score=1.0 — above threshold
      const above = makeNode("a", unitVec(1536, 0));
      // dot([1,0,...], [0.5, ~0.866,...]) = 0.5 < 0.60 — below threshold
      const below = makeNode("c", [0.5, Math.sqrt(0.75), ...Array.from({ length: 1534 }, () => 0)]);

      mockOpenai.generateEmbedding.mockResolvedValue(queryEmbedding);
      mockFirestoreKnowledge.listAllKnowledgeNodesWithEmbeddings.mockResolvedValue([above, below]);

      const { searchNodes } = await import("@/services/knowledgeSearchService");
      const results = await searchNodes("user-1", "query");

      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe("a");
    });

    it("zwraca fallback gdy żaden węzeł nie przekracza progu 0.60", async () => {
      const queryEmbedding = unitVec(1536, 0);
      // score=0.5 < 0.60
      const below = makeNode("b", [0.5, Math.sqrt(0.75), ...Array.from({ length: 1534 }, () => 0)]);

      mockOpenai.generateEmbedding.mockResolvedValue(queryEmbedding);
      mockFirestoreKnowledge.listAllKnowledgeNodesWithEmbeddings.mockResolvedValue([below]);

      const { searchNodes } = await import("@/services/knowledgeSearchService");
      const results = await searchNodes("user-1", "query");

      // fallback: returns top-3 even below threshold so AI always has context
      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe("b");
    });

    it("respektuje parametr limit", async () => {
      const queryEmbedding = unitVec(1536, 0);
      const nodes = Array.from({ length: 5 }, (_, i) => makeNode(`n${i}`, unitVec(1536, 0)));

      mockOpenai.generateEmbedding.mockResolvedValue(queryEmbedding);
      mockFirestoreKnowledge.listAllKnowledgeNodesWithEmbeddings.mockResolvedValue(nodes);

      const { searchNodes } = await import("@/services/knowledgeSearchService");
      const results = await searchNodes("user-1", "query", 3);

      expect(results).toHaveLength(3);
    });

    it("pomija węzły bez embeddingu", async () => {
      const queryEmbedding = unitVec(1536, 0);
      const nodeWithoutEmbedding = makeNode("x", []);

      mockOpenai.generateEmbedding.mockResolvedValue(queryEmbedding);
      mockFirestoreKnowledge.listAllKnowledgeNodesWithEmbeddings.mockResolvedValue([
        nodeWithoutEmbedding,
      ]);

      const { searchNodes } = await import("@/services/knowledgeSearchService");
      const results = await searchNodes("user-1", "query");

      expect(results).toHaveLength(0);
    });
  });
});
