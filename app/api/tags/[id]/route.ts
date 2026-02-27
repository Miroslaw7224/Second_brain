import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as tagService from "@/services/tagService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { tag, title, color } = body as { tag?: string; title?: string; color?: string };
  try {
    await tagService.updateUserTag(auth.uid, id, {
      tag: typeof tag === "string" ? tag.trim() : undefined,
      title: typeof title === "string" ? title.trim() : undefined,
      color: color !== undefined ? (typeof color === "string" ? color.trim() || null : null) : undefined,
    });
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
    await tagService.deleteUserTag(auth.uid, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
