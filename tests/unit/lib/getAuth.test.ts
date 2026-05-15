import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyIdToken = vi.hoisted(() => vi.fn());
const mockGetAuth = vi.hoisted(() => vi.fn());
const mockGetFirestore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase-admin", () => ({
  verifyIdToken: mockVerifyIdToken,
  getAuth: mockGetAuth,
  getFirestore: mockGetFirestore,
}));

import { getAuthUserId } from "@/lib/getAuth";

function makeReq(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token !== undefined) headers["authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/test", { headers });
}

function makeFirestoreWithEmail(empty: boolean) {
  return {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ empty }),
        }),
      }),
    }),
  };
}

describe("getAuthUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const result = await getAuthUserId(makeReq());
    const res = result as Response;
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 401 when Authorization header lacks 'Bearer ' prefix", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { authorization: "Basic abc123" },
    });
    const result = await getAuthUserId(req);
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 when token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
    const result = await getAuthUserId(makeReq("bad-token"));
    const res = result as Response;
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired/i);
  });

  it("returns 403 when user has no email", async () => {
    mockVerifyIdToken.mockResolvedValue("uid-1");
    mockGetAuth.mockReturnValue({
      getUser: vi.fn().mockResolvedValue({ email: undefined }),
    });
    const result = await getAuthUserId(makeReq("valid"));
    const res = result as Response;
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.allowed).toBe(false);
  });

  it("returns 403 when email is not on waitlist", async () => {
    mockVerifyIdToken.mockResolvedValue("uid-1");
    mockGetAuth.mockReturnValue({
      getUser: vi.fn().mockResolvedValue({ email: "user@example.com" }),
    });
    mockGetFirestore.mockReturnValue(makeFirestoreWithEmail(true));
    const result = await getAuthUserId(makeReq("valid"));
    expect((result as Response).status).toBe(403);
  });

  it("returns { uid } when token is valid and email is on waitlist", async () => {
    mockVerifyIdToken.mockResolvedValue("uid-1");
    mockGetAuth.mockReturnValue({
      getUser: vi.fn().mockResolvedValue({ email: "user@example.com" }),
    });
    mockGetFirestore.mockReturnValue(makeFirestoreWithEmail(false));
    const result = await getAuthUserId(makeReq("valid"));
    expect(result).toEqual({ uid: "uid-1" });
  });
});
