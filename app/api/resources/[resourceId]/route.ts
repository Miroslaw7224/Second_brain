import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as resourceService from "@/services/resourceService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  const { resourceId } = await params;
  let body: { title?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, tags } = body;
  if (title === undefined && tags === undefined) {
    return NextResponse.json({ error: "title or tags is required" }, { status: 400 });
  }
  const data: { title?: string; tags?: string[] } = {};
  if (title !== undefined) data.title = typeof title === "string" ? title.trim() : String(title).trim();
  if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : [String(tags)];
  try {
    await resourceService.updateResource(auth.uid, resourceId, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  const auth = await getAuthUserId(_request);
  if (auth instanceof NextResponse) return auth;
  const { resourceId } = await params;
  try {
    await resourceService.deleteResource(auth.uid, resourceId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleServiceError(err);
  }
}
