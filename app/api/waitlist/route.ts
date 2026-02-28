import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";

const WAITLIST_COLLECTION = "waitlist";

function isValidEmail(value: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value);
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { error: "Adres e-mail jest wymagany" },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Nieprawidłowy format adresu e-mail" },
      { status: 400 }
    );
  }

  const emailLower = email.toLowerCase();

  try {
    const db = getFirestore();
    const existing = await db
      .collection(WAITLIST_COLLECTION)
      .where("email", "==", emailLower)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        {
          success: true,
          message: "Ten adres e-mail jest już na liście oczekujących.",
        },
        { status: 200 }
      );
    }

    await db.collection(WAITLIST_COLLECTION).add({
      email: emailLower,
      createdAt: new Date(),
    });
    return NextResponse.json({
      success: true,
      message: "Dziękujemy! Zostałeś dodany do listy oczekujących.",
    });
  } catch (err) {
    console.error("Waitlist signup error:", err);
    return NextResponse.json(
      { error: "Nie udało się zapisać. Spróbuj ponownie później." },
      { status: 500 }
    );
  }
}
