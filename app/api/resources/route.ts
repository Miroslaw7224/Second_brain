import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as resourceService from "@/services/resourceService";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const resources = await resourceService.getResources(auth.uid);
    return NextResponse.json(resources);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: { description?: string; url?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { description, url, tags } = body;
  if (!description || typeof description !== "string" || !url || typeof url !== "string") {
    return NextResponse.json({ error: "description and url are required" }, { status: 400 });
  }
  try {
    const resource = await resourceService.addResource(auth.uid, {
      description: description.trim(),
      url: url.trim(),
      tags: Array.isArray(tags) ? tags : tags != null ? [String(tags)] : undefined,
    });
    return NextResponse.json(resource, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
