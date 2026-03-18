import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { parseBody } from "@/lib/parseBody";
import { generateNodeFromWeb } from "@/services/mindMapAIService";

const BodySchema = z.object({
  query: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, BodySchema);
  if (parsed.success === false) return parsed.response;

  try {
    const result = await generateNodeFromWeb(parsed.data.query);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
