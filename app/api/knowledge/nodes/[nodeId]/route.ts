import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as knowledgeNodeService from "@/services/knowledgeNodeService";
import { KnowledgeNode } from "@/types/knowledge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { nodeId } = await params;

  try {
    const node = await knowledgeNodeService.getNode(auth.uid, nodeId);
    if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ node });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { nodeId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const updates = body as Partial<
      Pick<KnowledgeNode, "title" | "content" | "tags" | "sources" | "dueDate" | "reminderAt">
    >;
    const node = await knowledgeNodeService.updateNode(auth.uid, nodeId, updates);
    return NextResponse.json({ node });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { nodeId } = await params;

  try {
    await knowledgeNodeService.deleteNode(auth.uid, nodeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
