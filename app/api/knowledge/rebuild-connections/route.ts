import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { buildConnections } from "@/services/knowledgeAIService";
import { listNodes } from "@/services/knowledgeNodeService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const nodes = await listNodes(auth.uid);
    await Promise.all(nodes.map((n) => buildConnections(auth.uid, n.id)));
    return NextResponse.json({ rebuilt: nodes.length });
  } catch (err) {
    return handleServiceError(err);
  }
}
