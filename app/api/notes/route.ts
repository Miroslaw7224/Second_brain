import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as noteService from "@/services/noteService";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const notes = await noteService.listNotes(auth.uid);
    return NextResponse.json(
      notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        created_at: n.created_at,
      }))
    );
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, content } = body;
  try {
    const result = await noteService.createNote(auth.uid, { title: title ?? "", content: content ?? "" });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
