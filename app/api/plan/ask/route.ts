import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as planService from "@/services/planService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: {
    message?: string;
    lang?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { message, lang = "en", history } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const historyArray = Array.isArray(body.history) ? body.history : [];
  try {
    const result = await planService.ask(auth.uid, { message, lang, history: historyArray });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
