import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as knowledgeSearchService from "@/services/knowledgeSearchService";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  try {
    const results = await knowledgeSearchService.searchNodes(auth.uid, q);
    return NextResponse.json({
      results: results.map(({ node, score }) => ({
        id: node.id,
        type: node.type,
        title: node.title,
        content: node.content,
        tags: node.tags,
        score,
      })),
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
