import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
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
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const name = file.name;
  const type = file.type;
  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json({ error: "Failed to read file content" }, { status: 400 });
  }
  try {
    const result = await documentService.ingestDocument(auth.uid, { name, content, type });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
