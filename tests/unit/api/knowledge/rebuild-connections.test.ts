import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockListNodes = vi.hoisted(() => vi.fn());
const mockBuildConnections = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeNodeService", () => ({ listNodes: mockListNodes }));
vi.mock("@/services/knowledgeAIService", () => ({ buildConnections: mockBuildConnections }));

import { POST } from "@/app/api/knowledge/rebuild-connections/route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/knowledge/rebuild-connections", {
    method: "POST",
    headers: { authorization: "Bearer valid" },
  });
}

describe("POST /api/knowledge/rebuild-connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rebuilds connections for all nodes and returns count", async () => {
    const nodes = [
      { id: "n1", title: "A" },
      { id: "n2", title: "B" },
    ];
    mockListNodes.mockResolvedValue(nodes);
    mockBuildConnections.mockResolvedValue(undefined);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rebuilt).toBe(2);
    expect(mockBuildConnections).toHaveBeenCalledTimes(2);
    expect(mockBuildConnections).toHaveBeenCalledWith("user-1", "n1");
    expect(mockBuildConnections).toHaveBeenCalledWith("user-1", "n2");
  });

  it("returns 0 when no nodes exist", async () => {
    mockListNodes.mockResolvedValue([]);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rebuilt).toBe(0);
    expect(mockBuildConnections).not.toHaveBeenCalled();
  });
});
