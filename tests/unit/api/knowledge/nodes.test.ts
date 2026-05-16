import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockListNodes = vi.hoisted(() => vi.fn());
const mockCreateNode = vi.hoisted(() => vi.fn());
const mockBuildConnections = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeNodeService", () => ({
  listNodes: mockListNodes,
  createNode: mockCreateNode,
}));
vi.mock("@/services/knowledgeAIService", () => ({ buildConnections: mockBuildConnections }));

import { GET, POST } from "@/app/api/knowledge/nodes/route";

function makeRequest(options: {
  method: "GET" | "POST";
  body?: unknown;
  searchParams?: Record<string, string>;
}): NextRequest {
  const url = new URL("http://localhost/api/knowledge/nodes");
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = { authorization: "Bearer valid" };
  if (options.body) headers["content-type"] = "application/json";
  return new NextRequest(url.toString(), {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

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

describe("GET /api/knowledge/nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when auth fails", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET(makeRequest({ method: "GET" }));
    expect(res.status).toBe(401);
  });

  it("returns list of nodes for authenticated user", async () => {
    mockListNodes.mockResolvedValue([fakeNode]);
    const res = await GET(makeRequest({ method: "GET" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0].id).toBe("node-1");
    expect(mockListNodes).toHaveBeenCalledWith("user-1", undefined);
  });

  it("filters by type when ?type= query param is provided", async () => {
    mockListNodes.mockResolvedValue([]);
    await GET(makeRequest({ method: "GET", searchParams: { type: "task" } }));
    expect(mockListNodes).toHaveBeenCalledWith("user-1", "task");
  });
});

describe("POST /api/knowledge/nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
    mockBuildConnections.mockResolvedValue(undefined);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ method: "POST", body: { title: "Test" } }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with created node on success", async () => {
    mockCreateNode.mockResolvedValue(fakeNode);
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { type: "note", title: "Test", content: "Content" },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.node.id).toBe("node-1");
    expect(mockCreateNode).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ type: "note", title: "Test", createdBy: "user" })
    );
  });
});
