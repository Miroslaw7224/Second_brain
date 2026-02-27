import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";

/**
 * Get current user uid from Authorization: Bearer <idToken>.
 * Returns { uid } or throws NextResponse with 401.
 */
export async function getAuthUserId(
  request: NextRequest
): Promise<{ uid: string } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }
  const idToken = authHeader.slice(7);
  try {
    const uid = await verifyIdToken(idToken);
    return { uid };
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
