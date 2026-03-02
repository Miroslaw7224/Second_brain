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
  let body: { title?: string; description?: string; url?: string; tags?: string[]; isFavorite?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, description, url, tags, isFavorite } = body;
  const data: { title?: string; description?: string; url?: string; tags?: string[]; isFavorite?: boolean } = {};
  if (title !== undefined) data.title = typeof title === "string" ? title.trim() : String(title).trim();
  if (description !== undefined) data.description = typeof description === "string" ? description.trim() : String(description).trim();
  if (url !== undefined) data.url = typeof url === "string" ? url.trim() : String(url).trim();
  if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : [String(tags)];
  if (isFavorite !== undefined) data.isFavorite = Boolean(isFavorite);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "At least one of title, description, url, tags, isFavorite is required" }, { status: 400 });
  }
  try {
    await resourceService.updateResource(auth.uid, resourceId, data);
    const resources = await resourceService.getResources(auth.uid);
    const updated = resources.find((r) => r.id === resourceId);
    return NextResponse.json(updated ?? { success: true });
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
