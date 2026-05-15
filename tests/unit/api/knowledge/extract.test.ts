import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockExtractNodes = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeAIService", () => ({
  extractNodesFromMessage: mockExtractNodes,
}));

import { POST } from "@/app/api/knowledge/extract/route";

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/knowledge/extract", {
    method: "POST",
    headers: { authorization: "Bearer valid", "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/knowledge/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when auth fails", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeRequest({ message: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is not a string", async () => {
    const res = await POST(makeRequest({ message: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns extracted nodes on success", async () => {
    const nodes = [
      {
        type: "resource",
        title: "Vercel",
        content: "Platforma do deploymentu",
        tags: [],
        sources: [],
      },
    ];
    mockExtractNodes.mockResolvedValue(nodes);

    const res = await POST(makeRequest({ message: "zapamiętaj https://vercel.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0].title).toBe("Vercel");
  });
});
