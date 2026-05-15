import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetFirestore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase-admin", () => ({ getFirestore: mockGetFirestore }));

import { GET } from "@/app/api/waitlist/check-email/route";

function makeRequest(email?: string): NextRequest {
  const url = new URL("http://localhost/api/waitlist/check-email");
  if (email !== undefined) url.searchParams.set("email", email);
  return new NextRequest(url.toString());
}

function makeFirestore(empty: boolean) {
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

describe("GET /api/waitlist/check-email", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await GET(makeRequest("not-an-email"));
    expect(res.status).toBe(400);
  });

  it("returns { allowed: true } when email is on waitlist", async () => {
    mockGetFirestore.mockReturnValue(makeFirestore(false));
    const res = await GET(makeRequest("user@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowed).toBe(true);
  });

  it("returns { allowed: false } when email is NOT on waitlist", async () => {
    mockGetFirestore.mockReturnValue(makeFirestore(true));
    const res = await GET(makeRequest("unknown@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowed).toBe(false);
  });
});
