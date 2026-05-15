import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockListNotes = vi.hoisted(() => vi.fn());
const mockCreateNote = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/noteService", () => ({
  listNotes: mockListNotes,
  createNote: mockCreateNote,
}));

import { GET, POST } from "@/app/api/notes/route";

function makeRequest(options?: { method?: string; body?: unknown }): NextRequest {
  const headers: Record<string, string> = { authorization: "Bearer valid" };
  if (options?.body) headers["content-type"] = "application/json";
  return new NextRequest("http://localhost/api/notes", {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

const fakeNote = {
  id: "note-1",
  title: "Moja notatka",
  content: "<p>Treść</p>",
  created_at: new Date().toISOString(),
};

describe("GET /api/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns notes array with id, title, content, created_at", async () => {
    mockListNotes.mockResolvedValue([fakeNote]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({ id: "note-1", title: "Moja notatka" });
    expect(mockListNotes).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("creates note with empty title/content when fields are omitted", async () => {
    mockCreateNote.mockResolvedValue(fakeNote);
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(200);
    expect(mockCreateNote).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ title: "", content: "" })
    );
  });

  it("creates note with provided title and content", async () => {
    mockCreateNote.mockResolvedValue(fakeNote);
    const res = await POST(
      makeRequest({ method: "POST", body: { title: "Nowa notatka", content: "<p>Treść</p>" } })
    );
    expect(res.status).toBe(200);
    expect(mockCreateNote).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ title: "Nowa notatka", content: "<p>Treść</p>" })
    );
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/notes", {
      method: "POST",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: "not-valid-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Invalid JSON" });
  });
});
