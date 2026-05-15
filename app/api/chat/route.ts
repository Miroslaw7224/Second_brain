import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { parseChatPostBody } from "@/lib/chatRequestBody";
import * as knowledgeAIService from "@/services/knowledgeAIService";

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
  const { message, lang, history } = parsed;
  try {
    const result = await knowledgeAIService.query(auth.uid, { message, lang, history });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
