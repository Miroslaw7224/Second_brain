import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockSearchNodes = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeSearchService", () => ({ searchNodes: mockSearchNodes }));

import { GET } from "@/app/api/knowledge/search/route";

function makeRequest(q?: string): NextRequest {
  const url = new URL("http://localhost/api/knowledge/search");
  if (q) url.searchParams.set("q", q);
  return new NextRequest(url.toString(), {
    headers: { authorization: "Bearer valid" },
  });
}

describe("GET /api/knowledge/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 400 when q param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns search results for valid query", async () => {
    mockSearchNodes.mockResolvedValue([
      {
        node: { id: "n1", title: "Vercel", content: "Deploy", type: "resource", tags: [] },
        score: 0.95,
      },
    ]);

    const res = await GET(makeRequest("vercel"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    // Route flattens { node, score } → { id, type, title, content, tags, score }
    expect(body.results[0].title).toBe("Vercel");
    expect(body.results[0].score).toBe(0.95);
    expect(body.results[0].id).toBe("n1");
    expect(mockSearchNodes).toHaveBeenCalledWith("user-1", "vercel");
  });

  it("returns empty results when nothing matches", async () => {
    mockSearchNodes.mockResolvedValue([]);
    const res = await GET(makeRequest("xyz-unknown"));
    const body = await res.json();
    expect(body.results).toHaveLength(0);
  });
});
