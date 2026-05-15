import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockGetNode = vi.hoisted(() => vi.fn());
const mockUpdateNode = vi.hoisted(() => vi.fn());
const mockDeleteNode = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeNodeService", () => ({
  getNode: mockGetNode,
  updateNode: mockUpdateNode,
  deleteNode: mockDeleteNode,
}));

import { GET, PATCH, DELETE } from "@/app/api/knowledge/nodes/[nodeId]/route";

function makeRequest(method: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = { authorization: "Bearer valid" };
  if (body) headers["content-type"] = "application/json";
  return new NextRequest("http://localhost/api/knowledge/nodes/node-1", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ nodeId: "node-1" });

const fakeNode = {
  id: "node-1",
  type: "note" as const,
  title: "Test",
  content: "Content",
  tags: [],
  sources: [],
  embedding: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "user" as const,
};

describe("GET /api/knowledge/nodes/[nodeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 404 when node does not exist", async () => {
    mockGetNode.mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(404);
  });

  it("returns node when found", async () => {
    mockGetNode.mockResolvedValue(fakeNode);
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node.id).toBe("node-1");
  });
});

describe("PATCH /api/knowledge/nodes/[nodeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("updates and returns node", async () => {
    const updated = { ...fakeNode, title: "Updated" };
    mockUpdateNode.mockResolvedValue(updated);

    const res = await PATCH(makeRequest("PATCH", { title: "Updated" }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node.title).toBe("Updated");
    expect(mockUpdateNode).toHaveBeenCalledWith("user-1", "node-1", { title: "Updated" });
  });
});

describe("DELETE /api/knowledge/nodes/[nodeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 200 ok after deletion", async () => {
    mockDeleteNode.mockResolvedValue(undefined);
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDeleteNode).toHaveBeenCalledWith("user-1", "node-1");
  });
});
