import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as knowledgeEdgeService from "@/services/knowledgeEdgeService";
import { KnowledgeEdgeInput } from "@/types/knowledge";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId");
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId query param is required" }, { status: 400 });
  }

  try {
    const edges = await knowledgeEdgeService.getEdgesForNode(auth.uid, nodeId);
    return NextResponse.json({ edges });
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

  const input = body as KnowledgeEdgeInput;
  if (!input.fromNodeId || !input.toNodeId || !input.relation || input.strength === undefined) {
    return NextResponse.json(
      { error: "fromNodeId, toNodeId, relation and strength are required" },
      { status: 400 }
    );
  }

  try {
    const edge = await knowledgeEdgeService.createEdge(auth.uid, input);
    return NextResponse.json({ edge }, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
