import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import * as tagService from "@/services/tagService";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const list = await tagService.getUserTags(auth.uid);
    return NextResponse.json(list);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { tag, title, color } = body as { tag?: string; title?: string; color?: string };
  if (!tag || typeof tag !== "string" || !tag.trim()) {
    return NextResponse.json({ error: "tag required" }, { status: 400 });
  }
  try {
    const created = await tagService.createUserTag(auth.uid, {
      tag: tag.trim(),
      title: typeof title === "string" ? title.trim() : "",
      color: typeof color === "string" ? color.trim() || undefined : undefined,
    });
    return NextResponse.json(created);
  } catch (err) {
    return handleServiceError(err);
  }
}
