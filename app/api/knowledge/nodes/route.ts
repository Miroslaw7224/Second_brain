import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as knowledgeNodeService from "@/services/knowledgeNodeService";
import { buildConnections } from "@/services/knowledgeAIService";
import { KnowledgeNodeInput, KnowledgeNodeType } from "@/types/knowledge";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as KnowledgeNodeType | null;

  try {
    const nodes = await knowledgeNodeService.listNodes(auth.uid, type ?? undefined);
    return NextResponse.json({ nodes });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body as KnowledgeNodeInput;
  if (!input.type || !input.title || !input.content) {
    return NextResponse.json({ error: "type, title and content are required" }, { status: 400 });
  }

  try {
    const node = await knowledgeNodeService.createNode(auth.uid, {
      ...input,
      createdBy: "user",
    });
    // Build connections in the background — don't await so response is fast
    buildConnections(auth.uid, node.id).catch(() => {});
    return NextResponse.json({ node }, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
