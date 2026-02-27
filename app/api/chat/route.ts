import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as ragService from "@/services/ragService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: { message?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { message, lang = "en" } = body;
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  try {
    const result = await ragService.query(auth.uid, { message, lang });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
