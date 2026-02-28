import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";

const WAITLIST_COLLECTION = "waitlist";

function isValidEmail(value: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value);
}

/**
 * GET /api/waitlist/check-email?email=... — sprawdza, czy adres jest na waitliście.
 * Bez auth (używane przed rejestracją).
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const trimmed = typeof email === "string" ? email.trim() : "";
  if (!trimmed) {
    return NextResponse.json(
      { error: "Brak parametru email", allowed: false },
      { status: 400 }
    );
  }
  if (!isValidEmail(trimmed)) {
    return NextResponse.json(
      { error: "Nieprawidłowy format adresu e-mail", allowed: false },
      { status: 400 }
    );
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection(WAITLIST_COLLECTION)
      .where("email", "==", trimmed.toLowerCase())
      .limit(1)
      .get();

    return NextResponse.json({ allowed: !snapshot.empty });
  } catch (err) {
    console.error("Waitlist check-email error:", err);
    return NextResponse.json(
      { error: "Błąd sprawdzania listy.", allowed: false },
      { status: 500 }
    );
  }
}
