import { NextRequest, NextResponse } from "next/server";
import { getAuth, getFirestore, verifyIdToken } from "@/lib/firebase-admin";

const WAITLIST_COLLECTION = "waitlist";
const WAITLIST_FORBIDDEN_MESSAGE = "Dostęp tylko dla osób z listy oczekujących.";

/**
 * Get current user uid from Authorization: Bearer <idToken>.
 * Also enforces waitlist: user must have an email and that email must be in the waitlist collection.
 * Returns { uid } or NextResponse with 401 (invalid/missing token) or 403 (not on waitlist).
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
  let uid: string;
  try {
    uid = await verifyIdToken(idToken);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const auth = getAuth();
  const user = await auth.getUser(uid);
  if (!user.email) {
    return NextResponse.json(
      { error: WAITLIST_FORBIDDEN_MESSAGE, allowed: false },
      { status: 403 }
    );
  }

  const db = getFirestore();
  const snapshot = await db
    .collection(WAITLIST_COLLECTION)
    .where("email", "==", user.email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return NextResponse.json(
      { error: WAITLIST_FORBIDDEN_MESSAGE, allowed: false },
      { status: 403 }
    );
  }

  return { uid };
}
