import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { parseBody } from "@/lib/parseBody";
import * as mindMapService from "@/services/mindMapService";

const CreateMindMapBodySchema = z.object({
  title: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const maps = await mindMapService.getMindMaps(auth.uid);
    return NextResponse.json(maps);
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, CreateMindMapBodySchema);
  if (parsed.success === false) return parsed.response;

  try {
    const map = await mindMapService.createMindMap(auth.uid, parsed.data.title ?? "");
    return NextResponse.json(map, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
