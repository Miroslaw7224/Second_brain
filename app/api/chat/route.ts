import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { parseChatPostBody } from "@/lib/chatRequestBody";
import * as ragService from "@/services/ragService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseChatPostBody(body);
  if (parsed.ok === false) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { message, lang } = parsed;
  try {
    const result = await ragService.query(auth.uid, { message, lang });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
