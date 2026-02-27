import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as noteService from "@/services/noteService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, content } = body;
  try {
    await noteService.updateNote(auth.uid, id, { title, content });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserId(_request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    await noteService.deleteNote(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
