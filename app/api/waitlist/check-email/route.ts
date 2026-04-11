import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { parseWaitlistCheckEmailParam } from "@/lib/waitlistCheckEmail";

const WAITLIST_COLLECTION = "waitlist";

/**
 * GET /api/waitlist/check-email?email=... — sprawdza, czy adres jest na waitliście.
 * Bez auth (używane przed rejestracją).
 */
export async function GET(request: NextRequest) {
  const parsed = parseWaitlistCheckEmailParam(request.nextUrl.searchParams.get("email"));
  if (!parsed.ok) {
    return NextResponse.json(parsed.body, { status: parsed.status });
  }
  const trimmed = parsed.email;

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(WAITLIST_COLLECTION)
      .where("email", "==", trimmed)
      .limit(1)
      .get();

    return NextResponse.json({ allowed: !snapshot.empty });
  } catch (err) {
    console.error("Waitlist check-email error:", err);
    return NextResponse.json({ error: "Błąd sprawdzania listy.", allowed: false }, { status: 500 });
  }
}
