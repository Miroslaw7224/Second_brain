import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/knowledgeAIService", () => ({ query: mockQuery }));

import { POST } from "@/app/api/chat/route";

function makeRequest(body?: unknown, token = "valid-token"): NextRequest {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when auth fails", async () => {
    // Route checks `auth instanceof NextResponse`, so we must return a NextResponse
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeRequest({ message: "hello" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({ lang: "pl" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/message/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns AI response with sources on success", async () => {
    mockQuery.mockResolvedValue({
      text: "Projekt X ma deadline 20 maja.",
      sources: ["Projekt X"],
    });

    const res = await POST(makeRequest({ message: "kiedy deadline projektu X?", lang: "pl" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("Projekt X ma deadline 20 maja.");
    expect(body.sources).toContain("Projekt X");
    expect(mockQuery).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ message: "kiedy deadline projektu X?", lang: "pl" })
    );
  });

  it("passes history to query when provided", async () => {
    mockQuery.mockResolvedValue({ text: "ok", sources: [] });
    const history = [{ role: "user", content: "poprzednia wiadomość" }];

    await POST(makeRequest({ message: "tak", lang: "pl", history }));

    expect(mockQuery).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        history: expect.arrayContaining([{ role: "user", content: "poprzednia wiadomość" }]),
      })
    );
  });
});
