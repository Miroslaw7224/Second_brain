import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockGetEdgesForNode = vi.hoisted(() => vi.fn());
const mockCreateEdge = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeEdgeService", () => ({
  getEdgesForNode: mockGetEdgesForNode,
  createEdge: mockCreateEdge,
}));

import { GET, POST } from "@/app/api/knowledge/edges/route";

function makeGetRequest(nodeId?: string): NextRequest {
  const url = new URL("http://localhost/api/knowledge/edges");
  if (nodeId) url.searchParams.set("nodeId", nodeId);
  return new NextRequest(url.toString(), {
    headers: { authorization: "Bearer valid" },
  });
}

function makePostRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/knowledge/edges", {
    method: "POST",
    headers: { authorization: "Bearer valid", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const fakeEdge = {
  id: "edge-1",
  fromNodeId: "node-a",
  toNodeId: "node-b",
  relation: "related",
  strength: 0.8,
};

describe("GET /api/knowledge/edges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 400 when nodeId is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it("returns edges for the given nodeId", async () => {
    mockGetEdgesForNode.mockResolvedValue([fakeEdge]);
    const res = await GET(makeGetRequest("node-a"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.edges).toHaveLength(1);
    expect(body.edges[0].fromNodeId).toBe("node-a");
    expect(mockGetEdgesForNode).toHaveBeenCalledWith("user-1", "node-a");
  });

  it("returns 401 when auth fails", async () => {
    const { NextResponse } = await import("next/server");
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET(makeGetRequest("node-a"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/knowledge/edges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 400 when required fields are missing (no strength)", async () => {
    const res = await POST(
      makePostRequest({ fromNodeId: "a", toNodeId: "b", relation: "related" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing (no relation)", async () => {
    const res = await POST(makePostRequest({ fromNodeId: "a", toNodeId: "b", strength: 0.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing entirely", async () => {
    const res = await POST(makePostRequest());
    expect(res.status).toBe(400);
  });

  it("creates edge and returns 201", async () => {
    mockCreateEdge.mockResolvedValue(fakeEdge);
    const res = await POST(
      makePostRequest({
        fromNodeId: "node-a",
        toNodeId: "node-b",
        relation: "related",
        strength: 0.8,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.edge.id).toBe("edge-1");
  });

  it("calls createEdge with correct arguments", async () => {
    mockCreateEdge.mockResolvedValue(fakeEdge);
    await POST(
      makePostRequest({
        fromNodeId: "node-a",
        toNodeId: "node-b",
        relation: "related",
        strength: 0.8,
      })
    );
    expect(mockCreateEdge).toHaveBeenCalledWith("user-1", {
      fromNodeId: "node-a",
      toNodeId: "node-b",
      relation: "related",
      strength: 0.8,
    });
  });

  it("returns 401 when auth fails", async () => {
    const { NextResponse } = await import("next/server");
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(
      makePostRequest({
        fromNodeId: "node-a",
        toNodeId: "node-b",
        relation: "related",
        strength: 0.8,
      })
    );
    expect(res.status).toBe(401);
  });
});
