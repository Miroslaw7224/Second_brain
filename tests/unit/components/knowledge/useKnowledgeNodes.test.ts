import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useKnowledgeNodes,
  searchKnowledgeNodes,
  fetchNodeEdges,
} from "@/features/knowledge/useKnowledgeNodes";
import { Timestamp } from "firebase-admin/firestore";

const fakeNode = {
  id: "node-1",
  type: "note" as const,
  title: "Test Node",
  content: "Content",
  tags: ["tag1"],
  sources: [],
  embedding: [],
  createdAt: Timestamp.fromDate(new Date()),
  updatedAt: Timestamp.fromDate(new Date()),
  createdBy: "user" as const,
};

describe("useKnowledgeNodes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pobiera węzły i ustawia state", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: [fakeNode] }),
    });

    const { result } = renderHook(() => useKnowledgeNodes(mockFetch));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith("/api/knowledge/nodes");
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].title).toBe("Test Node");
  });

  it("filtruje po typie gdy type jest podany", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { result } = renderHook(() => useKnowledgeNodes(mockFetch, "task"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith("/api/knowledge/nodes?type=task");
  });
});

describe("searchKnowledgeNodes", () => {
  it("zwraca wyniki wyszukiwania", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ id: "node-1", title: "Test", score: 0.9 }] }),
    });

    const results = await searchKnowledgeNodes(mockFetch, "test query");

    expect(mockFetch).toHaveBeenCalledWith("/api/knowledge/search?q=test%20query");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.9);
  });
});

describe("fetchNodeEdges", () => {
  it("zwraca krawędzie dla węzła", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          edges: [
            {
              id: "edge-1",
              fromNodeId: "node-1",
              toNodeId: "node-2",
              relation: "related",
              strength: 0.8,
            },
          ],
        }),
    });

    const edges = await fetchNodeEdges(mockFetch, "node-1");

    expect(mockFetch).toHaveBeenCalledWith("/api/knowledge/edges?nodeId=node-1");
    expect(edges).toHaveLength(1);
  });

  it("zwraca pustą tablicę gdy błąd API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });

    const edges = await fetchNodeEdges(mockFetch, "bad-id");

    expect(edges).toHaveLength(0);
  });
});
