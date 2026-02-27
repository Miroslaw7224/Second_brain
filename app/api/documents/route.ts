import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as documentService from "@/services/documentService";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const docs = await documentService.listDocuments(auth.uid);
    return NextResponse.json(
      docs.map((d) => ({
        id: d.id,
        name: d.name,
        content: d.content,
        type: d.type,
        created_at: d.created_at,
      }))
    );
  } catch (err) {
    return handleServiceError(err);
  }
}
