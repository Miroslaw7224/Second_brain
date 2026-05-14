import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as knowledgeEdgeService from "@/services/knowledgeEdgeService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ edgeId: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { edgeId } = await params;

  try {
    await knowledgeEdgeService.deleteEdge(auth.uid, edgeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
