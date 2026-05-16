import { renderHook, waitFor } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import { useKnowledgeGraph } from "@/src/features/wiedza/useKnowledgeGraph";

const mockNode = {
  id: "n1",
  type: "note",
  title: "Test note",
  content: "content",
  tags: [],
  createdBy: "user",
};

const mockEdge = {
  id: "e1",
  fromNodeId: "n1",
  toNodeId: "n2",
  relation: "related",
  strength: 0.8,
};

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => [mockNode] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ edges: [mockEdge] }) });
});

test("returns nodes and edges from API", async () => {
  const { result } = renderHook(() => useKnowledgeGraph(mockFetch));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.nodes).toHaveLength(1);
  expect(result.current.edges).toHaveLength(1);
  expect(result.current.nodes[0].id).toBe("n1");
});

test("returns empty arrays on fetch error", async () => {
  mockFetch.mockReset();
  mockFetch.mockRejectedValue(new Error("network error"));
  const { result } = renderHook(() => useKnowledgeGraph(mockFetch));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.nodes).toHaveLength(0);
  expect(result.current.edges).toHaveLength(0);
});
