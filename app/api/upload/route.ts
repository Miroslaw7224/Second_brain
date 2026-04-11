import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { parseUploadFormFile } from "@/lib/uploadFormFile";
import * as documentService from "@/services/documentService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const parsed = await parseUploadFormFile(formData);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { name, type, content } = parsed;
  try {
    const result = await documentService.ingestDocument(auth.uid, { name, content, type });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
