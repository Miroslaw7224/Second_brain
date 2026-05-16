import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockGetAuthUserId = vi.hoisted(() => vi.fn());
const mockUpdateTask = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock("@/lib/getAuth", () => ({ getAuthUserId: mockGetAuthUserId }));
vi.mock("@/services/taskService", () => ({
  updateTask: mockUpdateTask,
  deleteTask: mockDeleteTask,
}));

import { PUT, DELETE } from "@/app/api/tasks/[id]/route";

const params = Promise.resolve({ id: "task-1" });

function makeRequest(method: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = { authorization: "Bearer valid" };
  if (body) headers["content-type"] = "application/json";
  return new NextRequest("http://localhost/api/tasks/task-1", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("PUT /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await PUT(makeRequest("PUT", { title: "Test" }), { params });
    expect(res.status).toBe(401);
  });

  it("updates task and returns success", async () => {
    mockUpdateTask.mockResolvedValue(undefined);
    const res = await PUT(makeRequest("PUT", { title: "Updated", status: "in_progress" }), {
      params,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockUpdateTask).toHaveBeenCalledWith(
      "user-1",
      "task-1",
      expect.objectContaining({ title: "Updated", status: "in_progress" })
    );
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/tasks/task-1", {
      method: "PUT",
      headers: { authorization: "Bearer valid", "content-type": "application/json" },
      body: "invalid",
    });
    const res = await PUT(req, { params });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("deletes task and returns success", async () => {
    mockDeleteTask.mockResolvedValue(undefined);
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDeleteTask).toHaveBeenCalledWith("user-1", "task-1");
  });
});
